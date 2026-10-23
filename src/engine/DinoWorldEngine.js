import * as THREE from '../../vendor/three/build/three.module.js';
import { EffectComposer } from '../../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/three/examples/jsm/postprocessing/OutputPass.js';
import {
  buildPrehistoricCreature,
  buildScaleReferenceGroup,
  buildEraHabitatDiorama,
} from './DinoBiomechanicsEngine.js';
import { PBR, buildStudioEnvironmentScene } from './HyperRealKit.js';

/**
 * DinoWorldEngine.js — Dual-Mode Hyper-Realistic WebGL 3D Engine for DinoVerse 3D.
 *
 * Rendering stack: physically-based materials + per-era HDR image-based lighting (PMREM-baked
 * procedural paleo-sky & studio soft-boxes), warm key / cool fill / rim three-point lighting,
 * 2048px soft shadows, grounding contact shadow, ACES filmic tone mapping and HDR bloom.
 *
 * Modes:
 * - 'lab': 360° Paleontology Turntable & X-Ray Anatomy Lab for any of the 29 species,
 *          with Skin / Muscle+Organs / Fossil Skeleton toggle, 3D Human/Bus Scale Comparator,
 *          and 3D Projected Anatomical Hotspots.
 * - 'portal': Helical 3D Time-Portal across all 6 Geological Era Habitat Dioramas
 *             (Permian → Triassic → Jurassic → Early Cretaceous → Late Cretaceous → K-Pg).
 *             Diorama creatures are populated during idle frames so the lab is instant.
 */

export class DinoWorldEngine {
  constructor(canvas, eras, speciesList, callbacks = {}) {
    this.canvas = canvas;
    this.eras = eras;
    this.speciesList = speciesList;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040914, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      46,
      window.innerWidth / window.innerHeight,
      0.1,
      420
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Crisp scale/feather detail at grazing angles
    PBR.setAnisotropy(Math.min(16, this.renderer.capabilities.getMaxAnisotropy() || 1));

    // State
    this.viewMode = 'lab'; // 'lab' | 'portal'
    this.anatomyLayer = 'skin'; // 'skin' | 'muscle' | 'skeleton' | 'xray'
    this.showScaleComparator = false;
    this.whatIfActive = false;
    this.autoRotateTurntable = true;

    this.activeSpecies = this.speciesList[20] || this.speciesList[0]; // Default to T-Rex or first
    this.activeEraIndex = 4; // Late Cretaceous
    this.portalProgress = 4.0;
    this.targetPortalProgress = 4.0;

    // Camera spherical orbit
    this.orbitYaw = 0.55;
    this.orbitPitch = 0.22;
    this.orbitDistance = 4.6;
    this.focusOffset = new THREE.Vector3(0, 0.15, 0);
    this.targetFocusOffset = new THREE.Vector3(0, 0.15, 0);

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.clock = new THREE.Clock();

    this._initPostProcessing();
    this._initLights();
    this._initEnvironment();
    this._initAtmosphericSpores();

    // Scene containers
    this.labRoot = new THREE.Group();
    this.portalRoot = new THREE.Group();
    this.scene.add(this.labRoot);
    this.scene.add(this.portalRoot);

    this.activeLabRig = null;
    this.activeScaleGroup = null;
    this.eraDioramas = [];
    this.eraPositions = [];
    this._populationQueue = [];
    this._populationHandle = null;

    this._buildLabPedestal();
    this._buildPortalEras();
    this._bindInteractions();
  }

  _initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.32,
      0.55,
      0.82
    );
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  _initLights() {
    // Soft sky/ground ambient (most ambient now comes from the HDR environment map)
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x2a241c, 0.32);
    this.scene.add(this.hemiLight);

    // Warm key sun with high-resolution soft shadows
    this.sunLight = new THREE.DirectionalLight(0xfff1dc, 2.7);
    this.sunLight.position.set(8, 14, 9);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    const d = 6.5;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 60;
    this.sunLight.shadow.bias = -0.00035;
    this.sunLight.shadow.normalBias = 0.028;
    this.sunLight.shadow.radius = 4;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Cool fill from the opposite side
    this.fillLight = new THREE.DirectionalLight(0xcfe3ff, 0.55);
    this.fillLight.position.set(-9, 5, 4);
    this.scene.add(this.fillLight);

    // Rim / kicker to separate silhouettes from the dark backdrop
    this.rimLight = new THREE.DirectionalLight(0xbfdbfe, 0.9);
    this.rimLight.position.set(-6, 7, -10);
    this.scene.add(this.rimLight);

    // Era-tinted accent bounce
    this.accentLight = new THREE.PointLight(0xf59e0b, 0.9, 24, 1.6);
    this.accentLight.position.set(0, 3.5, 2.0);
    this.scene.add(this.accentLight);
  }

  /** Per-era HDR image-based lighting baked from a procedural paleo-sky + studio soft-boxes. */
  _initEnvironment() {
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envCache = new Map();
    this._envEraId = null;
    this.scene.environmentIntensity = 0.9;
    this._applyEnvironmentForEra(this.eras[this.activeEraIndex] || this.eras[0]);
  }

  _applyEnvironmentForEra(era) {
    if (!era || this._envEraId === era.id) return;
    this._envEraId = era.id;
    if (!this.envCache.has(era.id)) {
      const envScene = buildStudioEnvironmentScene({
        skyTint: era.skyTint || [0.05, 0.1, 0.2],
        themeHex: era.themeColor || '#10b981',
        sunDir: new THREE.Vector3(0.44, 0.76, 0.49),
      });
      const target = this.pmrem.fromScene(envScene, 0.035);
      this.envCache.set(era.id, target.texture);
    }
    this.scene.environment = this.envCache.get(era.id);
  }

  _initAtmosphericSpores() {
    const count = 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 45;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.32,
      map: PBR.softGlowSprite('#fde68a', 64),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sporeCloud = new THREE.Points(geo, mat);
    this.scene.add(this.sporeCloud);
  }

  _buildLabPedestal() {
    this.pedestalGroup = new THREE.Group();
    this.labRoot.add(this.pedestalGroup);

    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b1220,
      roughness: 0.58,
      metalness: 0.12,
      clearcoat: 0.25,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.35,
    });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.24, 96), floorMat);
    platform.position.y = -1.18;
    platform.receiveShadow = true;
    this.pedestalGroup.add(platform);

    // Soft grounding contact shadow beneath the specimen
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({
        map: PBR.contactShadowSprite(256),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -1.055;
    contact.renderOrder = 1;
    this.pedestalGroup.add(contact);

    // Concentric Metric Hologram Rings on Turntable
    [1.1, 2.1, 3.15].forEach((radius, idx) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, idx === 2 ? 0.035 : 0.015, 10, 72),
        new THREE.MeshBasicMaterial({
          color: idx === 2 ? 0xf59e0b : 0x38bdf8,
          transparent: true,
          opacity: idx === 2 ? 0.85 : 0.38,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.05;
      this.pedestalGroup.add(ring);
    });

    this.turntableMount = new THREE.Group();
    this.labRoot.add(this.turntableMount);
  }

  _buildPortalEras() {
    const spacingZ = -24;
    this.eraPositions = this.eras.map((_, i) => {
      const angle = i * 0.72;
      return new THREE.Vector3(Math.sin(angle) * 8.5, Math.cos(angle * 0.8) * 2.4, i * spacingZ);
    });

    this.portalSpline = new THREE.CatmullRomCurve3(this.eraPositions);

    // Glowing Time-Tunnel Ribbon connecting the 6 Prehistoric Eras
    const tubeGeo = new THREE.TubeGeometry(this.portalSpline, 180, 0.12, 12, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
    });
    this.portalRibbon = new THREE.Mesh(tubeGeo, tubeMat);
    this.portalRoot.add(this.portalRibbon);

    // Build each Era's terrain immediately; creatures are populated during idle time
    this.eraDioramas = this.eras.map((era, idx) => {
      const eraSpecies = this.speciesList.filter((s) => s.eraId === era.id);
      const dio = buildEraHabitatDiorama(era, eraSpecies, { deferCreatures: true });
      dio.group.position.copy(this.eraPositions[idx]);
      this.portalRoot.add(dio.group);
      return dio;
    });
  }

  /** Spawns deferred diorama creatures one at a time during idle frames, active era first. */
  _schedulePortalPopulation() {
    this._populationQueue = this.eraDioramas
      .map((dio, idx) => ({ dio, idx }))
      .sort((a, b) => Math.abs(a.idx - this.activeEraIndex) - Math.abs(b.idx - this.activeEraIndex));

    const step = () => {
      this._populationHandle = null;
      while (this._populationQueue.length && !this._populationQueue[0].dio.pendingSpecies.length) {
        this._populationQueue.shift();
      }
      if (!this._populationQueue.length) return;
      const instance = this._populationQueue[0].dio.spawnNext();
      if (instance) {
        instance.rig.setAnatomyLayer(this.anatomyLayer);
      }
      schedule();
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') {
        this._populationHandle = window.requestIdleCallback(step, { timeout: 400 });
      } else {
        this._populationHandle = window.setTimeout(step, 40);
      }
    };
    schedule();
  }

  init() {
    this.selectSpecies(this.activeSpecies.id);
    this.setViewMode('lab');
    this._animate();
    this._schedulePortalPopulation();
    if (this.callbacks.onReady) {
      this.callbacks.onReady();
    }
  }

  setViewMode(mode) {
    this.viewMode = mode === 'portal' ? 'portal' : 'lab';
    this.labRoot.visible = this.viewMode === 'lab';
    this.portalRoot.visible = this.viewMode === 'portal';

    if (this.viewMode === 'lab') {
      this.orbitDistance = this.labFitDistance || 4.5;
      this.targetFocusOffset.copy(this.labFitCenter || new THREE.Vector3(0, 0.15, 0));
    } else {
      this.orbitDistance = 9.2;
      this.targetFocusOffset.set(0, 0, 0);
    }

    if (this.callbacks.onModeChange) {
      this.callbacks.onModeChange(this.viewMode);
    }
  }

  selectSpecies(speciesId) {
    const found = this.speciesList.find((s) => s.id === speciesId);
    if (!found) return;
    this.activeSpecies = found;
    this.whatIfActive = false;

    const eraIdx = this.eras.findIndex((e) => e.id === found.eraId);
    if (eraIdx >= 0) {
      this.activeEraIndex = eraIdx;
      this.targetPortalProgress = eraIdx;
    }

    if (this.activeLabRig) {
      this.activeLabRig._disposed = true;
    }

    // Rebuild 3D dinosaur on turntable
    while (this.turntableMount.children.length > 0) {
      this.turntableMount.remove(this.turntableMount.children[0]);
    }

    const activeRigRef = buildPrehistoricCreature(found, 1.08, {
      onRealGLBReady: (upgradedRig) => {
        if (this.activeLabRig === upgradedRig) {
          this._fitCameraToActiveRig();
        }
      },
    });
    this.activeLabRig = activeRigRef;
    this.activeLabRig.setAnatomyLayer(this.anatomyLayer);
    this.activeLabRig.onStep = (foot, intensity, locomotion) => {
      if (this.viewMode === 'lab' && this.callbacks.onStep) {
        this.callbacks.onStep(found, foot, intensity, locomotion);
      }
    };
    this.turntableMount.add(this.activeLabRig.group);

    this.activeScaleGroup = buildScaleReferenceGroup(found);
    this.activeScaleGroup.visible = this.showScaleComparator;
    this.turntableMount.add(this.activeScaleGroup);

    this._fitCameraToActiveRig();

    if (this.callbacks.onSpeciesChange) {
      this.callbacks.onSpeciesChange(found, this.eras[this.activeEraIndex]);
    }
  }

  /** Lip-sync: opens the jaw / throws the head of the creature that is calling. */
  vocalize(speciesId, duration = 1.5, delay = 0) {
    if (this.viewMode === 'lab') {
      if (this.activeLabRig && (!speciesId || this.activeSpecies?.id === speciesId)) {
        this.activeLabRig.vocalize(duration, delay);
      }
      return;
    }
    this.eraDioramas.forEach((dio) => {
      dio.creatureInstances.forEach(({ rig, species }) => {
        if (!speciesId || species.id === speciesId) rig.vocalize(duration, delay);
      });
    });
  }

  /** Species that share the active era (for distant ambient calls). */
  getEraNeighbours() {
    const era = this.eras[this.activeEraIndex];
    if (!era) return [];
    return this.speciesList.filter((s) => s.eraId === era.id);
  }

  /** Frames the whole specimen: focus on its volumetric center, distance from its bounding sphere. */
  _fitCameraToActiveRig() {
    if (!this.activeLabRig) return;
    this.activeLabRig.group.updateMatrixWorld(true);
    const boundsTarget = this.activeLabRig.realGlbGroup || this.activeLabRig.group;
    const box = new THREE.Box3().setFromObject(boundsTarget, true);
    if (box.isEmpty()) {
      this.labFitDistance = 4.6;
      this.targetFocusOffset.set(0, 0.15, 0);
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fitFov = Math.min(vFov, hFov);
    const dist = (sphere.radius * 1.12) / Math.sin(fitFov / 2);
    this.labFitDistance = THREE.MathUtils.clamp(dist, 2.6, 11.0);
    this.labFitCenter = new THREE.Vector3(0, center.y, 0);
    this.targetFocusOffset.copy(this.labFitCenter);
    if (this.viewMode === 'lab') {
      this.orbitDistance = this.labFitDistance;
    }
  }

  selectEra(eraId) {
    const idx = this.eras.findIndex((e) => e.id === eraId);
    if (idx < 0) return;
    this.activeEraIndex = idx;
    this.targetPortalProgress = idx;

    // Select first species in this era if current species isn't in it
    if (this.activeSpecies.eraId !== eraId) {
      const firstInEra = this.speciesList.find((s) => s.eraId === eraId);
      if (firstInEra) {
        this.selectSpecies(firstInEra.id);
      }
    } else if (this.callbacks.onEraChange) {
      this.callbacks.onEraChange(this.eras[idx]);
    }
  }

  setAnatomyLayer(layer) {
    this.anatomyLayer = layer;
    if (this.activeLabRig) {
      this.activeLabRig.setAnatomyLayer(layer);
    }
    this.eraDioramas.forEach((dio) => {
      dio.creatureInstances.forEach(({ rig }) => rig.setAnatomyLayer(layer));
    });
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.layer-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.layer === layer);
      });
    }
  }

  setScaleComparatorVisible(visible) {
    this.showScaleComparator = Boolean(visible);
    if (this.activeScaleGroup) {
      this.activeScaleGroup.visible = this.showScaleComparator;
    }
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('btn-toggle-scale');
      if (btn) btn.setAttribute('aria-pressed', String(this.showScaleComparator));
    }
  }

  setScaleComparator(visible) {
    this.setScaleComparatorVisible(visible);
  }

  toggleWhatIf() {
    this.whatIfActive = !this.whatIfActive;
    return this.whatIfActive;
  }

  focusOnHotspot(hotspotIndex) {
    const hs = this.activeSpecies?.hotspots?.[hotspotIndex];
    if (!hs) {
      this.targetFocusOffset.copy(this.labFitCenter || new THREE.Vector3(0, 0.15, 0));
      this.orbitDistance = this.labFitDistance || 4.5;
      return;
    }
    const [hx, hy, hz] = hs.pos;
    const localVec = new THREE.Vector3(hx, hy, hz);
    if (this.turntableMount) {
      localVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.turntableMount.rotation.y);
    }
    this.targetFocusOffset.copy(localVec);
    this.orbitDistance = Math.max(2.0, (this.labFitDistance || 4.5) * 0.45);
  }

  resetCamera() {
    this.orbitYaw = 0.55;
    this.orbitPitch = 0.22;
    if (this.viewMode === 'lab') {
      this.targetFocusOffset.copy(this.labFitCenter || new THREE.Vector3(0, 0.15, 0));
      this.orbitDistance = this.labFitDistance || 4.5;
    } else {
      this.targetFocusOffset.set(0, 0, 0);
      this.orbitDistance = 9.2;
    }
  }

  zoomCamera(delta) {
    const minD = this.viewMode === 'lab' ? 1.4 : 4.5;
    const maxD = this.viewMode === 'lab' ? Math.max(9.5, (this.labFitDistance || 4.5) * 1.8) : 16.0;
    this.orbitDistance = Math.max(minD, Math.min(maxD, this.orbitDistance + delta));
  }

  /**
   * Projects the active dinosaur's 3D anatomical hotspots onto 2D viewport coordinates.
   */
  getProjectedHotspots() {
    if (this.viewMode !== 'lab' || !this.activeSpecies?.hotspots) return [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    const rotY = this.turntableMount ? this.turntableMount.rotation.y : 0;

    return this.activeSpecies.hotspots
      .map((hs, index) => {
        const worldPos = new THREE.Vector3(hs.pos[0], hs.pos[1], hs.pos[2]);
        worldPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        const projected = worldPos.project(this.camera);
        if (projected.z > 1.0) return null;
        return {
          index,
          hotspot: hs,
          x: (projected.x * 0.5 + 0.5) * width,
          y: (-projected.y * 0.5 + 0.5) * height,
        };
      })
      .filter(Boolean);
  }

  _bindInteractions() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
      this.bloomPass.resolution.set(w, h);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragStart.x = e.clientX;
      this.dragStart.y = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.dragStart.x = e.clientX;
      this.dragStart.y = e.clientY;
      this.orbitYaw -= dx * 0.0065;
      this.orbitPitch = Math.max(-0.45, Math.min(1.05, this.orbitPitch + dy * 0.0055));
    });

    const endDrag = () => {
      this.isDragging = false;
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);

    window.addEventListener(
      'wheel',
      (e) => {
        if (
          e.target.closest('.left-roster-panel') ||
          e.target.closest('.right-inspector-panel') ||
          e.target.closest('.modal-card')
        ) {
          return;
        }
        e.preventDefault();
        if (this.viewMode === 'portal') {
          const maxEra = this.eras.length - 1;
          const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.0025, 0.35);
          this.targetPortalProgress = Math.max(0, Math.min(maxEra, this.targetPortalProgress + delta));
          const nearest = Math.round(this.targetPortalProgress);
          if (nearest !== this.activeEraIndex) {
            this.selectEra(this.eras[nearest].id);
          }
        } else {
          this.zoomCamera(Math.sign(e.deltaY) * 0.38);
        }
      },
      { passive: false }
    );
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.focusOffset.lerp(this.targetFocusOffset, Math.min(1, dt * 6.0));

    let baseCenter = new THREE.Vector3(0, 0, 0);
    const activeEra = this.eras[this.activeEraIndex] || this.eras[0];
    this._applyEnvironmentForEra(activeEra);

    if (this.viewMode === 'lab') {
      if (this.autoRotateTurntable && !this.isDragging) {
        this.turntableMount.rotation.y += dt * 0.24;
      }
      if (this.activeLabRig) {
        this.activeLabRig.animate(elapsed, this.whatIfActive);
      }
    } else {
      this.portalProgress += (this.targetPortalProgress - this.portalProgress) * Math.min(1, dt * 5.5);
      const maxEra = Math.max(1, this.eras.length - 1);
      const u = Math.max(0, Math.min(1, this.portalProgress / maxEra));
      baseCenter.copy(this.portalSpline.getPointAt(u));

      this.eraDioramas.forEach((dio) => {
        dio.update(elapsed, this.whatIfActive);
      });
    }

    const lookTarget = baseCenter.clone().add(this.focusOffset);
    const camOffset = new THREE.Vector3(
      Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDistance,
      Math.sin(this.orbitPitch) * this.orbitDistance + 0.35,
      Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDistance
    );

    this.camera.position.copy(lookTarget).add(camOffset);
    this.camera.lookAt(lookTarget);

    this.sunLight.position.set(lookTarget.x + 7, lookTarget.y + 12, lookTarget.z + 8);
    this.sunLight.target.position.copy(lookTarget);
    this.sunLight.target.updateMatrixWorld();
    this.fillLight.position.set(lookTarget.x - 9, lookTarget.y + 5, lookTarget.z + 4);
    this.fillLight.target.position.copy(lookTarget);
    this.fillLight.target.updateMatrixWorld();
    this.rimLight.position.set(lookTarget.x - 6, lookTarget.y + 7, lookTarget.z - 10);
    this.rimLight.target.position.copy(lookTarget);
    this.rimLight.target.updateMatrixWorld();

    this.accentLight.position.set(lookTarget.x, lookTarget.y + 3.5, lookTarget.z + 2.0);
    this.accentLight.color.set(activeEra.themeColor || '#10b981');

    const [sr, sg, sb] = activeEra.skyTint || [0.02, 0.06, 0.1];
    const bgCol = new THREE.Color(sr, sg, sb);
    this.scene.background = bgCol;
    this.scene.fog.color.copy(bgCol);

    if (this.callbacks.onFrame) {
      this.callbacks.onFrame(elapsed);
    }

    this.composer.render();
  }
}

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
 *          with Skin / Fossil Skeleton toggle, 3D Human/Bus Scale Comparator,
 *          and 3D Projected Anatomical Hotspots.
 * - 'portal': Helical 3D Time-Portal across all 6 Geological Era Habitat Dioramas
 *             (Permian → Triassic → Jurassic → Early Cretaceous → Late Cretaceous → K-Pg).
 *             Diorama creatures are populated during idle frames so the lab is instant.
 *
 * Backdrop: 'light' soft studio cyclorama (default) or 'dark' per-era night sky. Switching it only
 * changes the background, fog and bloom threshold, never the image-based lighting on the specimens.
 */

export const DEFAULT_BACKDROP_THEME = 'light';

// Light backdrop: off-white tinted toward each era's theme colour so the six eras stay recognisable.
// These are linear HDR values: ACES filmic tone mapping (exposure 1.08) compresses them to on-screen
// pastels around #e5eae8–#ede6e7, which is why the gain is deliberately above 1.
const LIGHT_BACKDROP_BASE = new THREE.Color('#eef2f7');
const LIGHT_BACKDROP_ERA_TINT = 0.3;
const LIGHT_BACKDROP_HDR_GAIN = 1.6;
const DARK_BACKDROP_FALLBACK_TINT = [0.02, 0.06, 0.1];

// Bloom must ignore a bright backdrop, otherwise the whole frame glows and bleeds over the specimen.
const BLOOM_THRESHOLD = 0.82;
const BLOOM_BACKDROP_MARGIN = 0.2;

// Touch devices (phones/tablets): each era habitat pulls up to 4 multi-MB .glb creatures, so only the
// era you are looking at and its direct neighbours are filled (all six at once is ~80 MB of models).
const PORTAL_ERA_RADIUS_TOUCH = 1;
// Two-finger pinch: orbit-distance change per pixel of finger spread (wheel is 0.38 per notch).
const PINCH_ZOOM_PER_PX = 0.012;

/** Linear-light luminance, matching the weights of three.js' GLSL luminance() used by the bloom pass. */
function linearLuminance(color) {
  return 0.2126729 * color.r + 0.7151522 * color.g + 0.072175 * color.b;
}

function normalizeBackdropTheme(theme) {
  return theme === 'light' || theme === 'dark' ? theme : DEFAULT_BACKDROP_THEME;
}

/** Adds every GPU-backed resource an object holds (geometry, materials, their textures, bone textures). */
function collectGpuResources(obj, into) {
  if (obj.geometry) into.add(obj.geometry);
  if (obj.isSkinnedMesh && obj.skeleton) into.add(obj.skeleton);
  const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
  for (const material of materials) {
    into.add(material);
    for (const value of Object.values(material)) {
      if (value && value.isTexture) into.add(value);
    }
    for (const uniform of Object.values(material.uniforms || {})) {
      if (uniform && uniform.value && uniform.value.isTexture) into.add(uniform.value);
    }
  }
}

export class DinoWorldEngine {
  constructor(canvas, eras, speciesList, callbacks = {}, options = {}) {
    this.canvas = canvas;
    this.eras = eras;
    this.speciesList = speciesList;
    this.callbacks = callbacks;
    this.backdropTheme = normalizeBackdropTheme(options.backdropTheme);
    this._backdropKey = null;
    // Touch-primary device (phone/tablet): lighter shadows and on-demand era habitats to stay in mobile memory budgets.
    this.isTouchDevice =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    this._fitWasPortrait = window.innerWidth < window.innerHeight;

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
    this.anatomyLayer = 'skin'; // 'skin' | 'skeleton'
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
      BLOOM_THRESHOLD
    );
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  _initLights() {
    // Soft sky/ground ambient (most ambient now comes from the HDR environment map)
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x2a241c, 0.32);
    this.scene.add(this.hemiLight);

    // Warm key sun with high-resolution soft shadows (1024px on phones/tablets: 4x less GPU memory)
    this.sunLight = new THREE.DirectionalLight(0xfff1dc, 2.7);
    this.sunLight.position.set(8, 14, 9);
    this.sunLight.castShadow = true;
    const shadowMapSize = this.isTouchDevice ? 1024 : 2048;
    this.sunLight.shadow.mapSize.width = shadowMapSize;
    this.sunLight.shadow.mapSize.height = shadowMapSize;
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

  /** Applies the era's backdrop for the current theme to the background, fog and bloom threshold. */
  _applyBackdropForEra(era) {
    const key = `${this.backdropTheme}:${era.id}`;
    if (this._backdropKey === key) return;
    this._backdropKey = key;

    let color;
    if (this.backdropTheme === 'dark') {
      const [r, g, b] = era.skyTint || DARK_BACKDROP_FALLBACK_TINT;
      color = new THREE.Color(r, g, b);
    } else {
      color = LIGHT_BACKDROP_BASE.clone()
        .lerp(new THREE.Color(era.themeColor || '#10b981'), LIGHT_BACKDROP_ERA_TINT)
        .multiplyScalar(LIGHT_BACKDROP_HDR_GAIN);
    }

    this.scene.background = color;
    this.scene.fog.color.copy(color);
    this.bloomPass.threshold = Math.max(BLOOM_THRESHOLD, linearLuminance(color) + BLOOM_BACKDROP_MARGIN);
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

  /**
   * Spawns deferred diorama creatures one at a time during idle frames, active era first.
   * Desktop fills all six eras in the background; touch devices only fill eras within
   * PORTAL_ERA_RADIUS_TOUCH of the active one (re-run as the visitor moves through the portal).
   */
  _schedulePortalPopulation() {
    this._cancelPortalPopulation();
    const maxEraDistance = this.isTouchDevice ? PORTAL_ERA_RADIUS_TOUCH : Infinity;
    this._populationQueue = this.eraDioramas
      .map((dio, idx) => ({ dio, idx }))
      .filter(({ idx }) => Math.abs(idx - this.activeEraIndex) <= maxEraDistance)
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
        this._populationHandle = { idle: window.requestIdleCallback(step, { timeout: 400 }) };
      } else {
        this._populationHandle = { timer: window.setTimeout(step, 40) };
      }
    };
    schedule();
  }

  _cancelPortalPopulation() {
    const handle = this._populationHandle;
    if (!handle) return;
    if (handle.idle !== undefined && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(handle.idle);
    }
    if (handle.timer !== undefined) window.clearTimeout(handle.timer);
    this._populationHandle = null;
  }

  init() {
    this.selectSpecies(this.activeSpecies.id);
    this.setViewMode('lab');
    this._animate();
    // Phones/tablets wait until the Era Habitat Portal is opened (see setViewMode) instead of
    // downloading every habitat creature while the visitor is looking at one dinosaur.
    if (!this.isTouchDevice) this._schedulePortalPopulation();
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
      if (this.isTouchDevice) this._schedulePortalPopulation();
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
    const replacedObjects = [...this.turntableMount.children];
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

    // Free the previous specimen only now, so anything it shares with the new one stays alive.
    this._disposeReplacedObjects(replacedObjects);

    this._fitCameraToActiveRig();

    if (this.callbacks.onSpeciesChange) {
      this.callbacks.onSpeciesChange(found, this.eras[this.activeEraIndex]);
    }
  }

  /**
   * Releases the GPU memory (geometry, materials, textures, bone textures) of objects that just left
   * the turntable. Every pick parses a fresh copy of its .glb, so without this each dinosaur a kid
   * taps stays on the GPU until a phone browser kills the tab. Resources the live scene still uses
   * (shared procedural materials, habitat creatures, PMREM environment maps) are left untouched;
   * three.js re-uploads any shared resource that a later creature uses again.
   */
  _disposeReplacedObjects(objects) {
    if (!objects.length) return;
    const inUse = new Set();
    this.scene.traverse((obj) => collectGpuResources(obj, inUse));
    if (this.scene.environment) inUse.add(this.scene.environment);
    if (this.scene.background && this.scene.background.isTexture) inUse.add(this.scene.background);
    this.envCache.forEach((texture) => inUse.add(texture));

    const garbage = new Set();
    objects.forEach((root) => root.traverse((obj) => collectGpuResources(obj, garbage)));
    garbage.forEach((resource) => {
      if (!inUse.has(resource) && typeof resource.dispose === 'function') resource.dispose();
    });
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
    // Portrait phones see a much narrower horizontal field, so long necks and tails need a longer
    // pull-back than the desktop cap of 11 (aspect 0.59 on an iPhone allows ~18.7).
    const maxFitDistance = this.camera.aspect < 1 ? 11.0 / Math.max(this.camera.aspect, 0.45) : 11.0;
    this.labFitDistance = THREE.MathUtils.clamp(dist, 2.6, maxFitDistance);
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

    // Touch devices fill habitats on demand: the new era and its neighbours come next.
    if (this.isTouchDevice && this.viewMode === 'portal') {
      this._schedulePortalPopulation();
    }
  }

  setAnatomyLayer(layer) {
    // Only two layers are offered: outer skin and fossil skeleton.
    const next = layer === 'skeleton' ? 'skeleton' : 'skin';
    this.anatomyLayer = next;
    if (this.activeLabRig) {
      this.activeLabRig.setAnatomyLayer(next);
    }
    this.eraDioramas.forEach((dio) => {
      dio.creatureInstances.forEach(({ rig }) => rig.setAnatomyLayer(next));
    });
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.layer-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.layer === next);
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

  /** Switches the 3D backdrop between 'light' (studio cyclorama) and 'dark' (per-era night sky). */
  setBackdropTheme(theme) {
    this.backdropTheme = normalizeBackdropTheme(theme);
    this._applyBackdropForEra(this.eras[this.activeEraIndex] || this.eras[0]);
    return this.backdropTheme;
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
      // Rotating a phone/tablet swaps portrait <-> landscape framing; re-fit the specimen (only on an
      // actual flip, so the on-screen keyboard or a toolbar resize never resets the visitor's zoom).
      const portrait = w < h;
      if (this.isTouchDevice && this.viewMode === 'lab' && portrait !== this._fitWasPortrait) {
        this._fitWasPortrait = portrait;
        this._fitCameraToActiveRig();
      }
    });

    // One pointer orbits the camera; two touch pointers pinch-zoom (mouse/pen behave exactly as before).
    const activePointers = new Map();
    let pinchGap = 0;
    const currentPinchGap = () => {
      const [a, b] = activePointers.values();
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const startOrbitFrom = (point) => {
      this.isDragging = true;
      this.dragStart.x = point.x;
      this.dragStart.y = point.y;
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.canvas.setPointerCapture(e.pointerId);
      if (activePointers.size === 1) {
        startOrbitFrom({ x: e.clientX, y: e.clientY });
      } else if (activePointers.size === 2) {
        this.isDragging = false;
        pinchGap = currentPinchGap();
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2) {
        const gap = currentPinchGap();
        if (pinchGap > 0) this.zoomCamera((pinchGap - gap) * PINCH_ZOOM_PER_PX);
        pinchGap = gap;
        return;
      }
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.dragStart.x = e.clientX;
      this.dragStart.y = e.clientY;
      this.orbitYaw -= dx * 0.0065;
      this.orbitPitch = Math.max(-0.45, Math.min(1.05, this.orbitPitch + dy * 0.0055));
    });

    const endPointer = (e) => {
      activePointers.delete(e.pointerId);
      pinchGap = 0;
      if (activePointers.size === 1) {
        startOrbitFrom(activePointers.values().next().value); // keep orbiting with the remaining finger
      } else if (activePointers.size === 0) {
        this.isDragging = false;
      }
    };
    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);

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

    this._applyBackdropForEra(activeEra);

    if (this.callbacks.onFrame) {
      this.callbacks.onFrame(elapsed);
    }

    this.composer.render();
  }
}

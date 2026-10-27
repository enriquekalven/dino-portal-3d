import * as THREE from '../../vendor/three/build/three.module.js';
import {
  makePBRMaterial,
  makeKeratinMaterial,
  makeSoftTissueMaterial,
  makeFeatherCardMaterial,
  buildFeatherFan,
  buildRealisticEye,
  hashString,
} from './HyperRealKit.js';
import { upgradeRigWithRealGLB } from './RealDinoLoader.js';

/**
 * DinoBiomechanicsEngine.js — Parametric Multi-Jointed Hyper-Real 3D Dinosaur & Prehistoric Creature Engine.
 *
 * Features:
 * 1. 10 Biomechanical Body Plans supporting all 29 species with species-specific crests, sails,
 *    horns, plates, tail clubs, thumb spikes, pennaceous feather fans, sickle claws and hydrofoil flippers.
 * 2. Hyper-real surfacing: tileable Worley scale tessellation / feather vanes with tangent normal maps,
 *    natural pigment palette, clearcoat skin sheen, GPU countershading, keratin teeth/claws/horns/beaks,
 *    living eyes (iris, slit/round pupil, wet cornea, blinking lids, micro-saccades), nostrils, palate & tongue.
 * 3. 2-Layer Anatomical System ('skin' | 'skeleton'):
 *    - Skin Layer and Skeleton/Fossil Layer (articulated skull, vertebral column, ribcage, pelvis, limb bones).
 * 4. 3D Human-to-Dino Scale Comparator: 10-Year-Old Kid (1.4m), Adult Paleontologist (1.8m), Yellow School Bus (11.0m).
 * 5. Era Habitat Dioramas with deferred (idle-time) creature population.
 */

// World units per texture tile → consistent scale/feather density across every species.
const TILE = 0.55;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// -----------------------------------------------------------------------------
// 0. GEOMETRY HELPERS
// -----------------------------------------------------------------------------
/**
 * Lofts an elliptical cross-section along a Catmull-Rom spine. For +X spines: rx = vertical
 * half-extent, ry = lateral half-extent. UVs are arc-length mapped to TILE world units
 * (seamless integer wrap around the circumference) unless `uvOpts.unit` is set (0..1 UVs).
 */
export function buildLoftedOrganMesh(points, radii, material, radialSegments = 34, tubularSegments = 52, uvOpts = {}) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const geo = new THREE.BufferGeometry();
  const vertices = [];
  const normals = [];
  const uvs = [];
  const ventralAttr = [];
  const indices = [];

  const tile = uvOpts.tile ?? TILE;
  const unit = Boolean(uvOpts.unit);
  const noVentral = Boolean(uvOpts.noVentral);
  const closedCaps = uvOpts.closedCaps !== false;
  let meanR = 0;
  radii.forEach((r) => {
    meanR += (r.rx + r.ry) / 2;
  });
  meanR /= radii.length;
  const vRep = unit ? 1 : Math.max(1, Math.round((2 * Math.PI * meanR) / tile));
  const uScale = unit ? 1 : curve.getLength() / tile;

  const sampleStation = (u) => {
    const scaled = u * (radii.length - 1);
    const i = Math.floor(scaled);
    const f = scaled - i;
    const r0 = radii[Math.min(i, radii.length - 1)];
    const r1 = radii[Math.min(i + 1, radii.length - 1)];
    const mu = (1 - Math.cos(f * Math.PI)) * 0.5;
    const lerpProp = (k, def) => {
      const v0 = r0[k] !== undefined ? r0[k] : def;
      const v1 = r1[k] !== undefined ? r1[k] : def;
      return v0 + (v1 - v0) * mu;
    };
    return {
      rx: lerpProp('rx', 0.1),
      ry: lerpProp('ry', 0.1),
      dy: lerpProp('dy', 0),
      dz: lerpProp('dz', 0),
      dorsalRidge: lerpProp('dorsalRidge', uvOpts.dorsalRidge ?? 0.08),
      ribBulge: lerpProp('ribBulge', uvOpts.ribBulge ?? 0.06),
      bellyFlat: lerpProp('bellyFlat', uvOpts.bellyFlat ?? 0.1),
      keel: lerpProp('keel', uvOpts.keel ?? 0.0),
      ventral: lerpProp('ventral', noVentral ? 0.0 : 0.85),
    };
  };

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const pt = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const st = sampleStation(u);

    // Smooth hemispherical closure at the start/end so open tube ends never exist
    let capScale = 1.0;
    if (closedCaps) {
      if (i === 0 && st.rx > 0.006) capScale = 0.02;
      else if (i === 1 && radii[0].rx > 0.02) capScale = 0.68;
      else if (i === tubularSegments && st.rx > 0.006) capScale = 0.02;
      else if (i === tubularSegments - 1 && radii[radii.length - 1].rx > 0.02) capScale = 0.68;
    }

    const rx = st.rx * capScale;
    const ry = st.ry * capScale;

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      // Anatomical vertebrate cross-section: neural spine ridge on dorsum, barrel rib bulge, flattened/keeled belly,
      // plus subtle 3D intercostal rib relief & lateral muscle bundle definition along the thorax!
      const dorsalPeak = cosV > 0 ? Math.pow(cosV, 3.2) * st.dorsalRidge : 0;
      const ventralSquash = cosV < 0 ? -Math.pow(-cosV, 2.2) * st.bellyFlat : 0;
      const ventralKeel = cosV < -0.5 ? -Math.pow((-cosV - 0.5) * 2.0, 2.0) * st.keel : 0;
      const ribWave = st.ribBulge > 0.14 ? 1.0 + 0.032 * Math.sin(u * Math.PI * 16.0) * Math.sin(u * Math.PI) : 1.0;
      const lateralRib = Math.pow(Math.abs(sinV), 1.5) * (0.3 + 0.7 * Math.max(0, -cosV * 0.6 + 0.4)) * st.ribBulge * ribWave;

      const localV = rx * (cosV + dorsalPeak + ventralSquash + ventralKeel) + st.dy;
      const localL = ry * sinV * (1 + lateralRib) + st.dz;

      vertices.push(
        pt.x + localV * B.x + localL * N.x,
        pt.y + localV * B.y + localL * N.y,
        pt.z + localV * B.z + localL * N.z
      );

      const nx = cosV * B.x + sinV * N.x;
      const ny = cosV * B.y + sinV * N.y;
      const nz = cosV * B.z + sinV * N.z;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / len, ny / len, nz / len);

      uvs.push(u * uScale, (j / radialSegments) * vRep);
      const vWeight = cosV < -0.1 ? Math.min(1, Math.pow((-cosV - 0.1) / 0.9, 1.35)) * st.ventral : 0;
      ventralAttr.push(vWeight);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aVentral', new THREE.Float32BufferAttribute(ventralAttr, 1));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.noRefine = true;
  return mesh;
}

/**
 * Builds ONE continuous, seamless, high-resolution sculpted skin mesh from the tail tip (u=0)
 * through pelvis, ribcage, chest, and neck to the head attachment (u=1), with real-time
 * per-frame spinal wave deformation and synchronized proxy segment pivots for X-ray bones
 * and tail/neck attachments (clubs, thagomizers, feather fans).
 */
export function buildDeformingSpineBody({
  stations,
  material,
  radialSegments = 36,
  tubularSegments = 76,
  tailEndU = 0.42,
  neckStartU = 0.72,
  tailSegmentCount = 6,
}) {
  const points = stations.map((s) => s.pos);
  const mesh = buildLoftedOrganMesh(points, stations, material, radialSegments, tubularSegments);
  const curve = new THREE.CatmullRomCurve3(points);
  const posAttr = mesh.geometry.attributes.position;
  const basePos = new Float32Array(posAttr.array);
  const stride = radialSegments + 1;

  const ringU = new Float32Array(tubularSegments + 1);
  const ringCenterX = new Float32Array(tubularSegments + 1);
  const ringCenterY = new Float32Array(tubularSegments + 1);
  const ringTailW = new Float32Array(tubularSegments + 1);
  const ringNeckW = new Float32Array(tubularSegments + 1);
  const ringBreathW = new Float32Array(tubularSegments + 1);

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    ringU[i] = u;
    const pt = curve.getPointAt(u);
    ringCenterX[i] = pt.x;
    ringCenterY[i] = pt.y;
    ringTailW[i] = u < tailEndU ? Math.pow((tailEndU - u) / Math.max(0.01, tailEndU), 1.35) : 0;
    ringNeckW[i] = u > neckStartU ? Math.pow((u - neckStartU) / Math.max(0.01, 1 - neckStartU), 1.25) : 0;
    ringBreathW[i] = u >= tailEndU && u <= neckStartU ? Math.sin(((u - tailEndU) / Math.max(0.01, neckStartU - tailEndU)) * Math.PI) : 0;
  }

  // Invisible proxy segment pivots along the tail so X-ray caudal bones and tail clubs/spikes track the wave
  const tailSegments = [];
  const tailSegU = [];
  for (let s = 0; s < tailSegmentCount; s++) {
    const u = tailEndU * (1 - (s + 0.5) / tailSegmentCount);
    const pt = curve.getPointAt(u);
    const seg = new THREE.Group();
    seg.position.copy(pt);
    tailSegments.push(seg);
    tailSegU.push(u);
  }

  const headMount = new THREE.Group();
  const neckTipPt = curve.getPointAt(1.0);
  headMount.position.copy(neckTipPt);

  const tailTipMount = new THREE.Group();
  const tailTipPt = curve.getPointAt(0.02);
  tailTipMount.position.copy(tailTipPt);

  const evalOffset = (u, time, opts) => {
    const tw = u < tailEndU ? Math.pow((tailEndU - u) / Math.max(0.01, tailEndU), 1.35) : 0;
    const nw = u > neckStartU ? Math.pow((u - neckStartU) / Math.max(0.01, 1 - neckStartU), 1.25) : 0;
    const spd = opts.speed || 2.5;
    const tailPhase = time * spd - tw * (opts.tailWaveFreq || 3.2);
    const dzTail = Math.sin(tailPhase) * (opts.tailSwayZ ?? 0.22) * tw;
    const dyTail = Math.cos(tailPhase * 2) * (opts.tailSwayY ?? 0.05) * tw + (opts.tailLift ?? 0) * tw;
    const dyNeck = (opts.neckPitch ?? 0) * nw;
    const dzNeck = (opts.neckYaw ?? 0) * nw;
    const dxNeck = -Math.abs(opts.neckPitch ?? 0) * 0.18 * nw;
    const swimW = opts.swimMode ? Math.pow(1 - u * 0.78, 1.2) : 0;
    const dzSwim = opts.swimMode ? Math.sin(time * spd - (1 - u) * 4.2) * (opts.swimAmp ?? 0.28) * swimW : 0;
    return {
      dx: dxNeck,
      dy: dyTail + dyNeck,
      dz: dzTail + dzNeck + dzSwim,
    };
  };

  const deform = (time, opts = {}) => {
    const arr = posAttr.array;
    const breath = opts.breath ?? Math.sin(time * 2.4) * 0.022;
    for (let i = 0; i <= tubularSegments; i++) {
      const u = ringU[i];
      const off = evalOffset(u, time, opts);
      const bw = 1 + breath * ringBreathW[i];
      const cy = ringCenterY[i];
      const rowBase = i * stride * 3;
      for (let j = 0; j <= radialSegments; j++) {
        const idx = rowBase + j * 3;
        const bx = basePos[idx];
        const by = basePos[idx + 1];
        const bz = basePos[idx + 2];
        arr[idx] = bx + off.dx;
        arr[idx + 1] = cy + (by - cy) * bw + off.dy;
        arr[idx + 2] = bz * bw + off.dz;
      }
    }
    posAttr.needsUpdate = true;

    for (let s = 0; s < tailSegmentCount; s++) {
      const u = tailSegU[s];
      const pt = curve.getPointAt(u);
      const off = evalOffset(u, time, opts);
      const offNext = evalOffset(Math.max(0, u - 0.05), time, opts);
      tailSegments[s].position.set(pt.x + off.dx, pt.y + off.dy, pt.z + off.dz);
      tailSegments[s].rotation.y = (offNext.dz - off.dz) * 3.2;
      tailSegments[s].rotation.z = -(offNext.dy - off.dy) * 2.5;
    }

    const hOff = evalOffset(1.0, time, opts);
    headMount.position.set(neckTipPt.x + hOff.dx, neckTipPt.y + hOff.dy, neckTipPt.z + hOff.dz);

    const tOff = evalOffset(0.02, time, opts);
    const tOffPrev = evalOffset(0.08, time, opts);
    tailTipMount.position.set(tailTipPt.x + tOff.dx, tailTipPt.y + tOff.dy, tailTipPt.z + tOff.dz);
    tailTipMount.rotation.y = (tOff.dz - tOffPrev.dz) * 3.8;
    tailTipMount.rotation.z = -(tOff.dy - tOffPrev.dy) * 2.8;
  };

  return { mesh, tailSegments, headMount, tailTipMount, deform, curve };
}

/**
 * Builds a sculpted vertebrate skull (upper cranium with brow ridges, jugal flare, nasal bridge,
 * antorbital depression + articulated mandible with adductor jaw muscle mass, oral palate & tongue).
 */
export function buildSculptedSkull({
  length = 0.9,
  height = 0.36,
  width = 0.28,
  snoutTaper = 0.45,
  snoutDrop = -0.02,
  browRidge = 0.14,
  nasalBoss = 0.08,
  premaxNotch = 0.0,
  jugalFlare = 0.16,
  jawDepth = 0.42,
  toothCount = 12,
  toothLength = 0.06,
  toothRadius = 0.013,
  toothCurl = 0.25,
  hasBeak = false,
  beakHook = 0.06,
  skinMat,
  darkMat,
  toothMat,
  beakMat,
  palateMat,
}) {
  const headGroup = new THREE.Group();
  const L = length;
  const H = height;
  const W = width;

  // Upper cranium + rostrum lofted from occipital condyle (-0.08*L) to premaxillary tip (L)
  const upperPts = [
    V3(-L * 0.08, H * 0.12, 0),
    V3(L * 0.18, H * 0.2, 0),
    V3(L * 0.44, H * 0.17 + nasalBoss * H, 0),
    V3(L * 0.72, H * (0.11 - premaxNotch * 0.22) + snoutDrop * 0.5, 0),
    V3(L * 0.94, H * 0.05 + snoutDrop, 0),
    V3(L * 1.03, H * 0.01 + snoutDrop - (hasBeak ? beakHook : 0), 0),
  ];
  const upperRadii = [
    { rx: H * 0.48, ry: W * 0.78, dorsalRidge: 0.08, ribBulge: 0.06, bellyFlat: 0.22, ventral: 0.2 },
    { rx: H * 0.54, ry: W * (0.76 + jugalFlare * 0.22), dorsalRidge: browRidge, ribBulge: -0.08, bellyFlat: 0.28, ventral: 0.15 },
    { rx: H * 0.48, ry: W * (0.66 * (0.65 + 0.35 * snoutTaper)), dorsalRidge: 0.12 + nasalBoss, ribBulge: -0.04, bellyFlat: 0.32, ventral: 0.1 },
    { rx: H * (0.38 - premaxNotch * 0.08), ry: W * (0.54 * snoutTaper + 0.12), dorsalRidge: 0.1, ribBulge: 0.02, bellyFlat: 0.34, ventral: 0.1 },
    { rx: H * 0.26, ry: W * (0.42 * snoutTaper + 0.07), dorsalRidge: 0.06, ribBulge: 0.02, bellyFlat: 0.3, ventral: 0.05 },
    { rx: H * 0.06, ry: W * 0.11, dorsalRidge: 0.02, bellyFlat: 0.2, ventral: 0.0 },
  ];
  const cranium = buildLoftedOrganMesh(
    upperPts,
    upperRadii,
    hasBeak && beakMat ? skinMat : skinMat,
    34,
    40
  );
  headGroup.add(cranium);

  // Keratinous rostral beak sheath if applicable
  if (hasBeak && beakMat) {
    const beakPts = [
      V3(L * 0.72, H * 0.08 + snoutDrop * 0.4, 0),
      V3(L * 0.94, H * 0.02 + snoutDrop, 0),
      V3(L * 1.06, -H * 0.12 + snoutDrop - beakHook, 0),
    ];
    const beakR = [
      { rx: H * 0.32, ry: W * (0.48 * snoutTaper + 0.12), dorsalRidge: 0.16, bellyFlat: 0.25 },
      { rx: H * 0.22, ry: W * (0.34 * snoutTaper + 0.06), dorsalRidge: 0.18, bellyFlat: 0.2 },
      { rx: H * 0.03, ry: W * 0.04, dorsalRidge: 0.1 },
    ];
    const beakMesh = buildLoftedOrganMesh(beakPts, beakR, beakMat, 22, 18, { unit: true, noVentral: true });
    beakMesh.userData.hardTissue = true;
    headGroup.add(beakMesh);
  }

  // Oral palate & fleshy inner cheek wall
  if (palateMat) {
    attachPalate(headGroup, palateMat, {
      x: L * 0.48,
      y: -H * 0.04,
      rx: L * 0.42,
      ry: H * 0.08,
      rz: W * (0.48 * snoutTaper + 0.14),
    });
  }

  // Articulated lower mandible (jawPivot) — same skinMat with ventral attribute so zero yellow capsule patch!
  const jawPivot = new THREE.Group();
  jawPivot.position.set(L * 0.08, -H * 0.12, 0);
  const jawL = L * 0.88;
  const jawH = H * jawDepth;
  const jawPts = [
    V3(-jawL * 0.08, 0.02, 0),
    V3(jawL * 0.18, -jawH * 0.18, 0),
    V3(jawL * 0.52, -jawH * 0.14, 0),
    V3(jawL * 0.84, -jawH * 0.06 + snoutDrop * 0.6, 0),
    V3(jawL * 0.98, 0.0 + snoutDrop * 0.7, 0),
  ];
  const jawRadii = [
    { rx: jawH * 0.58, ry: W * 0.76, dorsalRidge: 0.04, ribBulge: 0.16, bellyFlat: 0.08, ventral: 0.85 },
    { rx: jawH * 0.72, ry: W * 0.78, dorsalRidge: 0.05, ribBulge: 0.22, bellyFlat: 0.06, ventral: 0.95 },
    { rx: jawH * 0.48, ry: W * (0.54 * snoutTaper + 0.12), dorsalRidge: 0.02, ribBulge: 0.08, bellyFlat: 0.12, ventral: 0.95 },
    { rx: jawH * 0.34, ry: W * (0.38 * snoutTaper + 0.08), dorsalRidge: 0.02, ribBulge: 0.05, bellyFlat: 0.15, ventral: 0.9 },
    { rx: jawH * 0.08, ry: W * 0.1, ventral: 0.8 },
  ];
  const mandible = buildLoftedOrganMesh(jawPts, jawRadii, skinMat, 28, 32);
  jawPivot.add(mandible);

  if (hasBeak && beakMat) {
    const predentaryPts = [
      V3(jawL * 0.68, -jawH * 0.08 + snoutDrop * 0.5, 0),
      V3(jawL * 0.92, 0.02 + snoutDrop * 0.6, 0),
      V3(jawL * 1.0, H * 0.08 + snoutDrop * 0.6, 0),
    ];
    const predentaryR = [
      { rx: jawH * 0.36, ry: W * (0.38 * snoutTaper + 0.08) },
      { rx: jawH * 0.26, ry: W * (0.28 * snoutTaper + 0.05) },
      { rx: jawH * 0.05, ry: W * 0.06 },
    ];
    const lowBeak = buildLoftedOrganMesh(predentaryPts, predentaryR, beakMat, 18, 14, { unit: true, noVentral: true });
    lowBeak.userData.hardTissue = true;
    jawPivot.add(lowBeak);
  }

  // Muscular fleshy tongue + lateral adductor cheek fold (M. adductor mandibulae rictus) closing the rear corner of the mouth
  if (palateMat) {
    const tonguePts = [
      V3(jawL * 0.14, 0.02, 0),
      V3(jawL * 0.48, 0.04, 0),
      V3(jawL * 0.78, 0.01 + snoutDrop * 0.4, 0),
    ];
    const tongueR = [
      { rx: jawH * 0.26, ry: W * 0.42 },
      { rx: jawH * 0.24, ry: W * (0.34 * snoutTaper + 0.08) },
      { rx: jawH * 0.06, ry: W * 0.1 },
    ];
    const tongue = buildLoftedOrganMesh(tonguePts, tongueR, palateMat, 14, 14, { unit: true, noVentral: true });
    jawPivot.add(tongue);

    [-1, 1].forEach((side) => {
      const rictusPts = [
        V3(jawL * 0.04, -jawH * 0.04, side * W * 0.64),
        V3(jawL * 0.18, H * 0.14, side * W * 0.68),
        V3(jawL * 0.26, H * 0.28, side * W * 0.58),
      ];
      const rictusR = [
        { rx: jawH * 0.28, ry: W * 0.14 },
        { rx: jawH * 0.34, ry: W * 0.16 },
        { rx: jawH * 0.16, ry: W * 0.08 },
      ];
      const rictus = buildLoftedOrganMesh(rictusPts, rictusR, palateMat, 10, 8, { unit: true, noVentral: true });
      jawPivot.add(rictus);
    });
  }

  // Maxillary & dentary teeth along curved gumline
  if (toothCount > 0 && toothMat) {
    for (let t = 0; t < toothCount; t++) {
      const u = t / Math.max(1, toothCount - 1);
      const tx = L * (0.28 + u * 0.64);
      const sizeProfile = Math.sin(u * Math.PI * 0.88 + 0.18) * (1 - premaxNotch * Math.exp(-Math.pow((u - 0.72) / 0.14, 2)) * 0.45);
      const tLen = toothLength * (0.55 + 0.55 * sizeProfile);
      const tRad = toothRadius * (0.65 + 0.4 * sizeProfile);
      const zSpread = W * (0.62 - u * (0.34 * (1 - snoutTaper * 0.55)));
      const gumY = -H * 0.06 + Math.sin(u * Math.PI * 1.4) * H * 0.03 + snoutDrop * u;
      [-1, 1].forEach((side) => {
        const upTooth = buildCurvedTooth(tLen, tRad, toothMat, toothCurl);
        upTooth.position.set(tx, gumY, side * zSpread);
        upTooth.rotation.x = side * 0.06;
        headGroup.add(upTooth);

        if (t < toothCount - 1) {
          const lowTooth = buildCurvedTooth(tLen * 0.78, tRad * 0.85, toothMat, -toothCurl * 0.7);
          lowTooth.scale.y = -1;
          lowTooth.position.set(tx - L * 0.09, 0.02 + snoutDrop * u * 0.5, side * zSpread * 0.86);
          jawPivot.add(lowTooth);
        }
      });
    }
  }

  headGroup.add(jawPivot);
  return { headGroup, jawPivot };
}

/**
 * Builds an articulated 3-segment biomechanical limb (thigh/upper-arm → knee/calf/forearm → ankle/foot/toes)
 * using continuous anatomical lofts so hip, knee, and ankle transitions look muscular and seamless.
 */
export function buildArticulatedLimb({
  side = 1,
  thighLen = 0.75,
  shinLen = 0.72,
  footLen = 0.34,
  thighR = 0.26,
  shinR = 0.15,
  toeCount = 3,
  clawLen = 0.14,
  clawR = 0.032,
  sickleClaw = false,
  thumbSpike = false,
  hoofed = false,
  sprawling = 0.0,
  digitigrade = true,
  skinMat,
  clawMat,
  legBoneGroups,
}) {
  const hipGroup = new THREE.Group();

  // 1. Muscular thigh / humerus with broad gluteal/deltoid hip fan tapering to the knee condyle
  const outX = sprawling * side * thighLen * 0.45;
  const thighPts = [
    V3(0.05, 0.22 * thighLen, -side * thighR * 0.38),
    V3(0.05, -thighLen * 0.32, outX * 0.45),
    V3(0.02, -thighLen * 0.76, outX * 0.88),
    V3(-0.02, -thighLen, outX),
  ];
  const thighRadii = [
    { rx: thighR * 1.32, ry: thighR * 1.02, dorsalRidge: 0.16, ribBulge: 0.22, ventral: 0.35 },
    { rx: thighR * 1.24, ry: thighR * 0.9, dorsalRidge: 0.16, ribBulge: 0.24, ventral: 0.45 },
    { rx: thighR * 0.82, ry: thighR * 0.68, dorsalRidge: 0.1, ribBulge: 0.12, ventral: 0.4 },
    { rx: shinR * 1.12, ry: shinR * 0.98, dorsalRidge: 0.08, ventral: 0.3 },
  ];
  const thighMesh = buildLoftedOrganMesh(thighPts, thighRadii, skinMat, 26, 24);
  hipGroup.add(thighMesh);

  if (legBoneGroups) {
    legBoneGroups.push({
      group: hipGroup,
      length: thighLen * 0.88,
      radius: thighR * 0.22,
      yOffset: -thighLen * 0.48,
    });
  }

  // 2. Knee/Elbow pivot + Gastrocnemius calf / forearm loft + Metatarsus
  const kneeGroup = new THREE.Group();
  kneeGroup.position.set(-0.02, -thighLen * 0.92, outX);

  const metaDrop = digitigrade ? shinLen * 0.38 : 0;
  const calfPts = digitigrade
    ? [
        V3(0.02, 0.05, 0),
        V3(-0.06, -shinLen * 0.34, 0),
        V3(-0.11, -shinLen * 0.68, 0),
        V3(0.04, -shinLen - metaDrop * 0.65, 0),
        V3(0.08, -shinLen - metaDrop, 0),
      ]
    : [
        V3(0.02, 0.05, 0),
        V3(0.01, -shinLen * 0.42, 0),
        V3(0.0, -shinLen * 0.82, 0),
        V3(0.02, -shinLen, 0),
      ];
  const calfRadii = digitigrade
    ? [
        { rx: shinR * 1.1, ry: shinR * 0.95, dorsalRidge: 0.12, ventral: 0.25 },
        { rx: shinR * 1.18, ry: shinR * 0.92, dorsalRidge: 0.1, ribBulge: 0.18, ventral: 0.25 },
        { rx: shinR * 0.68, ry: shinR * 0.62, dorsalRidge: 0.06, ventral: 0.2 },
        { rx: shinR * 0.56, ry: shinR * 0.54, dorsalRidge: 0.05, ventral: 0.15 },
        { rx: shinR * 0.64, ry: shinR * 0.72, bellyFlat: 0.35, ventral: 0.15 },
      ]
    : [
        { rx: shinR * 1.08, ry: shinR * 0.95, dorsalRidge: 0.08, ventral: 0.25 },
        { rx: shinR * 1.04, ry: shinR * 0.92, ribBulge: 0.14, ventral: 0.2 },
        { rx: shinR * 0.88, ry: shinR * 0.86, ventral: 0.15 },
        { rx: shinR * 1.05, ry: shinR * 1.08, bellyFlat: 0.45, ventral: 0.1 },
      ];
  const shinMesh = buildLoftedOrganMesh(calfPts, calfRadii, skinMat, 24, 24);
  kneeGroup.add(shinMesh);

  if (legBoneGroups) {
    legBoneGroups.push({
      group: kneeGroup,
      length: (shinLen + metaDrop) * 0.85,
      radius: shinR * 0.26,
      yOffset: -(shinLen + metaDrop) * 0.46,
    });
  }

  // 3. Ankle / Foot cushion + Splayed Toes & Keratin Claws/Hooves
  const footGroup = new THREE.Group();
  footGroup.position.set(digitigrade ? 0.08 : 0.02, -shinLen - metaDrop, 0);

  // Plantar foot pad
  const padPts = [
    V3(-footLen * 0.22, 0.03, 0),
    V3(footLen * 0.22, 0.01, 0),
    V3(footLen * 0.55, -0.01, 0),
  ];
  const padR = [
    { rx: shinR * 0.58, ry: shinR * 0.78, bellyFlat: 0.5, ventral: 0.2 },
    { rx: shinR * 0.52, ry: shinR * 0.96, bellyFlat: 0.55, ventral: 0.2 },
    { rx: shinR * 0.28, ry: shinR * 0.75, bellyFlat: 0.6, ventral: 0.1 },
  ];
  footGroup.add(buildLoftedOrganMesh(padPts, padR, skinMat, 18, 12));

  for (let t = 0; t < toeCount; t++) {
    const u = toeCount === 1 ? 0 : (t / (toeCount - 1)) * 2 - 1;
    const zOff = u * shinR * 0.82;
    const midBoost = 1 - Math.abs(u) * 0.22;
    const tL = footLen * 0.78 * midBoost;
    const tR = shinR * (hoofed ? 0.36 : 0.28) * midBoost;

    if (sickleClaw && ((side < 0 && t === toeCount - 1) || (side > 0 && t === 0))) {
      // Raised hyper-extensible Dromaeosaurid Pedal Digit II sickle claw
      const sickleHolder = new THREE.Group();
      sickleHolder.position.set(footLen * 0.18, 0.06, zOff * 0.85);
      const sPts = [
        V3(0, 0, 0),
        V3(clawLen * 0.65, clawLen * 0.85, 0),
        V3(clawLen * 1.25, clawLen * 0.35, 0),
        V3(clawLen * 1.15, -clawLen * 0.28, 0),
      ];
      const sRad = [
        { rx: clawR * 1.45, ry: clawR * 0.9 },
        { rx: clawR * 1.15, ry: clawR * 0.72 },
        { rx: clawR * 0.65, ry: clawR * 0.45 },
        { rx: 0.005, ry: 0.005 },
      ];
      const sMesh = buildLoftedOrganMesh(sPts, sRad, clawMat, 14, 16, { unit: true, noVentral: true });
      sMesh.userData.hardTissue = true;
      sickleHolder.add(sMesh);
      footGroup.add(sickleHolder);
      continue;
    }

    const toePts = [
      V3(footLen * 0.18, 0.01, zOff * 0.65),
      V3(footLen * 0.18 + tL * 0.55, -0.01, zOff * 0.95),
      V3(footLen * 0.18 + tL, -0.02, zOff * 1.12),
    ];
    const toeRadii = [
      { rx: tR * 0.95, ry: tR * 0.92, bellyFlat: 0.45, ventral: 0.15 },
      { rx: tR * 0.82, ry: tR * 0.85, bellyFlat: 0.45, ventral: 0.1 },
      { rx: tR * 0.52, ry: tR * 0.62, bellyFlat: 0.5, ventral: 0.05 },
    ];
    footGroup.add(buildLoftedOrganMesh(toePts, toeRadii, skinMat, 14, 10));

    if (clawMat && clawLen > 0) {
      const cPts = hoofed
        ? [
            V3(footLen * 0.18 + tL * 0.85, -0.01, zOff * 1.08),
            V3(footLen * 0.18 + tL + clawLen * 0.55, -0.025, zOff * 1.15),
          ]
        : [
            V3(footLen * 0.18 + tL * 0.88, -0.005, zOff * 1.08),
            V3(footLen * 0.18 + tL + clawLen * 0.55, -0.02, zOff * 1.15),
            V3(footLen * 0.18 + tL + clawLen, -0.045, zOff * 1.2),
          ];
      const cRad = hoofed
        ? [
            { rx: tR * 0.55, ry: tR * 0.72, bellyFlat: 0.6 },
            { rx: tR * 0.18, ry: tR * 0.52, bellyFlat: 0.7 },
          ]
        : [
            { rx: clawR * midBoost, ry: clawR * 0.82 * midBoost },
            { rx: clawR * 0.62 * midBoost, ry: clawR * 0.52 * midBoost },
            { rx: 0.005, ry: 0.005 },
          ];
      const claw = buildLoftedOrganMesh(cPts, cRad, clawMat, 12, 10, { unit: true, noVentral: true });
      claw.userData.hardTissue = true;
      footGroup.add(claw);
    }
  }

  // Conical thumb spike (Iguanodon pollex spike)
  if (thumbSpike && clawMat) {
    const spPts = [
      V3(footLen * 0.25, 0.04, -side * shinR * 0.9),
      V3(footLen * 0.45, 0.11, -side * shinR * 1.45),
      V3(footLen * 0.62, 0.16, -side * shinR * 1.85),
    ];
    const spR = [
      { rx: clawR * 1.4, ry: clawR * 1.4 },
      { rx: clawR * 0.85, ry: clawR * 0.85 },
      { rx: 0.006, ry: 0.006 },
    ];
    const spike = buildLoftedOrganMesh(spPts, spR, clawMat, 12, 10, { unit: true, noVentral: true });
    spike.userData.hardTissue = true;
    footGroup.add(spike);
  }

  kneeGroup.add(footGroup);
  hipGroup.add(kneeGroup);

  return { hipGroup, kneeGroup, footGroup };
}

/**
 * Builds a thin, leaf/pentagonal diamond-shaped Stegosaur dorsal bony plate with vascular grooves
 * (replacing the 4-sided pyramid ConeGeometry).
 */
export function buildStegoPlate(height = 0.42, width = 0.34, thickness = 0.042, material) {
  const rows = 14;
  const radial = 28;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= rows; i++) {
    const v = i / rows; // 0 = base embedded in back, 1 = apex tip
    // Pentagonal kite/leaf silhouette: widens from base to v=0.46, then tapers to a sharp diamond point at v=1
    const chordProfile = v < 0.46
      ? 0.52 + 0.48 * Math.sin((v / 0.46) * (Math.PI * 0.5))
      : Math.pow(Math.max(0.02, (1 - v) / 0.54), 0.88);
    const halfChord = (width * 0.5) * chordProfile;
    const halfThick = (thickness * 0.5) * (1 - 0.78 * Math.pow(v, 1.3)) * (i === rows ? 0.05 : 1);
    const xShift = -width * 0.14 * v * v;

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      // Vascular branching ridges along the flat faces of the plate
      const groove = 1 + 0.08 * Math.sin(cosA * 18 + v * 6) * (1 - Math.abs(cosA) * 0.5);
      const px = xShift + cosA * halfChord;
      const py = v * height;
      const pz = sinA * halfThick * Math.pow(Math.max(0.05, 1 - 0.65 * cosA * cosA), 0.45) * groove;
      positions.push(px, py, pz);
      uvs.push((cosA * 0.5 + 0.5) * (width / TILE), (v * height) / TILE);
    }
  }

  const stride = radial + 1;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.noRefine = true;
  return mesh;
}

/**
 * Hydrofoil fin / flipper / fluke lobe: elliptical sections along local +Z (root → tip),
 * width along local X (chord), thickness along local Y. Optional trailing sweep.
 */
export function buildFinMesh({
  length = 0.5,
  widthAt = (t) => 0.22 * (1 - 0.7 * t * t),
  thickAt = (t) => 0.05 * (1 - 0.8 * t),
  sweep = 0.08,
  rings = 14,
  radial = 24,
  material,
}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const cx = -sweep * t * t;
    const w = Math.max(0.004, widthAt(t)) * 0.5;
    const th = Math.max(0.003, thickAt(t)) * 0.5;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      positions.push(cx + Math.cos(a) * w, Math.sin(a) * th, t * length);
      uvs.push((j / radial) * 2, (t * length) / TILE);
    }
  }
  const stride = radial + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Continuous dorsal sail / neural-spine membrane sheet (x0 → x1) with a height profile. */
export function buildSailMembrane({ x0, x1, baseYAt, heightAt, material, segments = 30, rows = 8, flutter = 0.015 }) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const x = x0 + (x1 - x0) * u;
    const yBase = baseYAt(u);
    const h = heightAt(u);
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      positions.push(x, yBase + h * v, Math.sin(u * Math.PI * 3) * flutter * v * v);
      uvs.push((u * Math.abs(x1 - x0)) / TILE, (v * h) / TILE);
    }
  }
  const stride = rows + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Pterosaur-style wing membrane panel: leading edge along local Z (x = 0), chord trailing toward -X. */
export function buildMembranePanel({ span, chordRoot, chordTip, side = 1, material, segments = 18, rows = 6, sag = 0.05, tipRound = 0.4 }) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const chord = (chordRoot + (chordTip - chordRoot) * t) * (1 - tipRound * Math.pow(t, 4));
    for (let j = 0; j <= rows; j++) {
      const s = j / rows;
      positions.push(-s * chord, -sag * Math.sin(Math.PI * s) * (1 - 0.6 * t), side * t * span);
      uvs.push((t * span) / TILE, (s * chord) / TILE);
    }
  }
  const stride = rows + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Recurved conical tooth (root at origin, pointing -Y, curving toward -X). */
export function buildCurvedTooth(length, radius, material, curl = 0.3) {
  const pts = [V3(0, 0.02 * length, 0), V3(-curl * length * 0.25, -length * 0.5, 0), V3(-curl * length, -length, 0)];
  const radii = [
    { rx: radius, ry: radius * 0.85 },
    { rx: radius * 0.62, ry: radius * 0.55 },
    { rx: 0.004, ry: 0.004 },
  ];
  const m = buildLoftedOrganMesh(pts, radii, material, 10, 10, { unit: true });
  m.userData.hardTissue = true;
  return m;
}

/**
 * Ceratopsian parietal–squamosal frill: a thick, gently domed bone shield with an egg-shaped
 * outline, a superelliptic bead-like rim and closed front/back faces (no plank edges).
 * Local frame: base of the shield at the origin, +Y toward the top rim, Z lateral, convex
 * (posterior) face toward -X, lateral edges wrapping forward (+X) around the neck.
 * Returns { mesh, rimPoint(theta) } where theta = 0 is the top of the rim and ±PI/2 the
 * lateral extremes (used to seat epoccipital studs exactly on the rim).
 */
export function buildFrillShield({
  height = 1.2,
  halfWidth = 0.8,
  thickness = 0.1,
  dome = 0.12,
  wrap = 0.14,
  rimBulge = 0.45,
  edgePower = 2.4,
  radial = 56,
  rings = 12,
  material,
}) {
  const topR = height * 0.58;
  const botR = height - topR;
  const outline = (theta) => {
    const c = Math.cos(theta); // +Y component
    const s = Math.sin(theta); // +Z component
    const ry = c >= 0 ? topR : botR;
    const rz = halfWidth * (c >= 0 ? 1 : 0.84); // slightly narrower where it meets the skull
    return 1 / Math.sqrt((c / ry) ** 2 + (s / rz) ** 2);
  };
  const thicknessAt = (rho) => {
    const edge = Math.pow(Math.max(0, 1 - Math.pow(rho, edgePower)), 1 / edgePower);
    const bead = 1 + rimBulge * Math.exp(-Math.pow((rho - 0.9) / 0.09, 2));
    return thickness * edge * bead;
  };
  const midX = (rho, zNorm) => -dome * (1 - rho * rho) + wrap * zNorm * zNorm * (1 - 0.3 * rho * rho);

  const positions = [];
  const uvs = [];
  const indices = [];
  const pushRing = (rho, sideSign) => {
    for (let j = 0; j < radial; j++) {
      const theta = (j / radial) * Math.PI * 2;
      const r = outline(theta) * rho;
      const y = botR + r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const x = midX(rho, z / halfWidth) + sideSign * thicknessAt(rho) * 0.5;
      positions.push(x, y, z);
      uvs.push((z + halfWidth) / TILE, y / TILE);
    }
  };
  // Front (+X) face from the centre outward, then the back (-X) face from the rim inward
  for (let i = 0; i <= rings; i++) pushRing(i / rings, 1);
  for (let i = rings - 1; i >= 0; i--) pushRing(i / rings, -1);
  const ringCount = 2 * rings + 1;
  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const jn = (j + 1) % radial;
      const a = i * radial + j;
      const b = (i + 1) * radial + j;
      const c = (i + 1) * radial + jn;
      const d = i * radial + jn;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.noRefine = true;

  const rimPoint = (theta) => {
    const r = outline(theta);
    const y = botR + r * Math.cos(theta);
    const z = r * Math.sin(theta);
    return {
      position: V3(midX(1, z / halfWidth), y, z),
      dir: V3(0, Math.cos(theta), Math.sin(theta)).normalize(),
    };
  };
  return { mesh, rimPoint };
}

/** Orients `obj` so local +Y points along `forward` and local +Z along `up`. */
function orientYToward(obj, forward, up = new THREE.Vector3(0, 0, 1)) {
  const f = forward.clone().normalize();
  const u = up.clone().sub(f.clone().multiplyScalar(up.dot(f))).normalize();
  const r = new THREE.Vector3().crossVectors(f, u);
  const m = new THREE.Matrix4().makeBasis(r, f, u);
  obj.quaternion.setFromRotationMatrix(m);
}

// -----------------------------------------------------------------------------
// 1. LIVING FACE DETAILS — EYES, NOSTRILS, PALATE
// -----------------------------------------------------------------------------
const EYE_PRESETS = {
  theropod: { iris: '#c47a1c', pupil: 'slit' },
  feathered: { iris: '#b5c43a', pupil: 'round' },
  sauropod: { iris: '#4a2f17', pupil: 'round' },
  ornithischian: { iris: '#6b4a24', pupil: 'round' },
  synapsid: { iris: '#b8641a', pupil: 'slit' },
  pterosaur: { iris: '#d98a1c', pupil: 'round' },
  avian: { iris: '#2b1d12', pupil: 'round' },
  marine: { iris: '#1b2a3a', pupil: 'round' },
  deepMarine: { iris: '#17324a', pupil: 'wide' },
};

function attachEyes(headGroup, lidMaterial, { x, y, z, radius, preset, gazeForward = 0.35, gazeUp = 0.06, irisHex, pupil }) {
  return [-1, 1].map((side) => {
    const gaze = new THREE.Vector3(gazeForward, gazeUp, side).normalize();
    const eye = buildRealisticEye({
      radius,
      irisHex: irisHex || preset.iris,
      pupil: pupil || preset.pupil,
      lidMaterial,
      gaze,
    });
    // Offset the eye group slightly outward along its gaze normal so the cornea & iris clear the lateral skull wall
    // while the socketHood torus stays embedded in the orbital bone!
    eye.group.position.set(
      x + gaze.x * radius * 0.48,
      y + gaze.y * radius * 0.48,
      side * z + gaze.z * radius * 0.48
    );
    headGroup.add(eye.group);
    return eye;
  });
}

const NOSTRIL_MAT = new THREE.MeshStandardMaterial({ color: 0x0f0908, roughness: 0.96 });
const NARIAL_RIM_MAT = new THREE.MeshStandardMaterial({ color: 0x2a1c17, roughness: 0.68 });
function attachNostrils(headGroup, { x, y, z, r }) {
  [-1, 1].forEach((side) => {
    const nGroup = new THREE.Group();
    nGroup.position.set(x, y, side * z);
    const n = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), NOSTRIL_MAT);
    n.scale.set(1.15, 0.72, 0.55);
    n.userData.noRefine = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, r * 0.28, 8, 16), NARIAL_RIM_MAT);
    rim.scale.set(1.15, 0.75, 0.9);
    rim.rotation.y = side * 0.28;
    rim.userData.noRefine = true;
    nGroup.add(n, rim);
    headGroup.add(nGroup);
  });
}

/** Dark mouth-roof ellipsoid that hides the hollow inside of an open-jawed skull. */
function attachPalate(headGroup, material, { x, y, rx, ry, rz }) {
  const palate = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), material);
  palate.scale.set(rx, ry, rz);
  palate.position.set(x, y, 0);
  palate.userData.noRefine = true;
  palate.castShadow = false;
  headGroup.add(palate);
  return palate;
}

function pickSkinPattern(species) {
  const h = hashString(species.id);
  switch (species.rigType) {
    case 'mosasaur':
    case 'ichthyosaur':
    case 'plesiosaur':
    case 'pterosaur':
      return 'plain';
    case 'theropod':
      return ['stripes', 'mottle', 'spots', 'stripes'][h % 4];
    case 'sauropod':
      return ['mottle', 'plain', 'mottle'][h % 3];
    case 'hadrosaur':
      return ['stripes', 'spots'][h % 2];
    case 'synapsid':
      return ['stripes', 'mottle'][h % 2];
    case 'ceratopsian':
    case 'ankylosaur':
    case 'stegosaur':
      return ['mottle', 'spots'][h % 2];
    default:
      return 'mottle';
  }
}

function skinOptions(species, cfg, extra = {}) {
  const seed = (hashString(species.id) % 997) + 3 + (extra.seedOffset || 0);
  const lengthM = Math.max(0.5, Math.min(36, species.metrics?.lengthM || 8));
  const autoCells = Math.round((cfg.hasFeathers ? 12 : 17) + lengthM * 0.38);
  return {
    style: cfg.hasFeathers ? 'feathers' : 'scales',
    seed,
    pattern: pickSkinPattern(species),
    cells: cfg.scaleCells || autoCells,
    roughness: 0.56,
    bumpScale: 0.12,
    ...extra,
  };
}

// -----------------------------------------------------------------------------
// 2. SHARED ANATOMICAL MATERIALS (FOSSIL SKELETON LAYER)
// -----------------------------------------------------------------------------
function createAnatomicalMaterials() {
  const boneMat = makePBRMaterial('fossilBone', '#efe2c4', '#8a5a2b', {
    style: 'bone',
    roughness: 0.4,
    bumpScale: 0.07,
    clearcoat: 0.08,
  });
  const ghostMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.14,
    roughness: 0.2,
    depthWrite: false,
  });
  return { boneMat, ghostMat };
}

/**
 * Attaches an internal articulated skeleton (ribcage, spine vertebrae, pelvis,
 * skull, tail and limb bones) to a creature's torso and head groups.
 */
function attachInternalAnatomyAndSkeleton(
  torsoGroup,
  headGroup,
  tailSegments,
  legBoneGroups,
  anatMats,
  opts = {}
) {
  const skeletonGroup = new THREE.Group();
  skeletonGroup.visible = false;
  torsoGroup.add(skeletonGroup);

  const lengthScale = opts.lengthScale || 1.0;
  const ribRadius = opts.ribRadius || 0.38;

  // 1. Thoracic Vertebral Spine + Neural Spines + 9 Pairs of Curved Ribs
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const vx = (-0.65 + u * 1.35) * lengthScale;
    const vy = (0.18 + Math.sin(u * Math.PI) * 0.12) * ribRadius * 1.5;

    const centrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.13 * lengthScale, 10),
      anatMats.boneMat
    );
    centrum.rotation.z = Math.PI / 2;
    centrum.position.set(vx, vy, 0);
    skeletonGroup.add(centrum);

    const neuralSpine = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.18, 0.025),
      anatMats.boneMat
    );
    neuralSpine.position.set(vx, vy + 0.11, 0);
    neuralSpine.rotation.z = -0.18;
    skeletonGroup.add(neuralSpine);

    // Left & Right Curved Thoracic Ribs
    if (i >= 1 && i <= 7) {
      const archFactor = Math.sin(((i - 1) / 6) * Math.PI) * 0.4 + 0.65;
      [-1, 1].forEach((side) => {
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(ribRadius * archFactor, 0.018, 8, 18, Math.PI * 0.82),
          anatMats.boneMat
        );
        rib.position.set(vx, vy - ribRadius * 0.42, side * 0.03);
        rib.rotation.y = side * (Math.PI / 2);
        rib.rotation.x = Math.PI * 0.1;
        skeletonGroup.add(rib);
      });
    }
  }

  // 2. Pelvic Girdle (Ilium, Ischium, Pubis with Perforate Acetabulum)
  const pelvisBone = new THREE.Group();
  pelvisBone.position.set(-0.42 * lengthScale, 0.12, 0);
  [-0.14, 0.14].forEach((zSide) => {
    const ilium = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.04), anatMats.boneMat);
    ilium.position.set(0, 0.08, zSide);
    const pubis = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.36, 8), anatMats.boneMat);
    pubis.position.set(0.1, -0.12, zSide * 0.85);
    pubis.rotation.z = 0.45;
    const ischium = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.38, 8), anatMats.boneMat);
    ischium.position.set(-0.14, -0.12, zSide * 0.85);
    ischium.rotation.z = -0.55;
    pelvisBone.add(ilium, pubis, ischium);
  });
  skeletonGroup.add(pelvisBone);

  // 3. Internal Caudal Bone Cylinders inside each moving tail segment
  const tailBones = [];
  tailSegments.forEach((seg, sIdx) => {
    const r = Math.max(0.018, 0.048 * Math.pow(0.84, sIdx));
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, 0.22, 8), anatMats.boneMat);
    bone.rotation.z = Math.PI / 2;
    bone.position.x = opts.reverseFacing ? 0.11 : -0.11;
    bone.visible = false;
    seg.add(bone);
    tailBones.push(bone);
  });

  // 4. Internal Limb Bone Shafts (Femur, Tibia, Humerus)
  const limbBones = [];
  legBoneGroups.forEach(({ group, length = 0.45, radius = 0.042, yOffset = -0.22 }) => {
    const bone = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.82, length, 10),
      anatMats.boneMat
    );
    bone.position.y = yOffset;
    bone.visible = false;
    group.add(bone);
    limbBones.push(bone);
  });

  // 5. Internal Skull Bone inside Head Group
  let skullBone = null;
  if (headGroup) {
    skullBone = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.52, 10),
      anatMats.boneMat
    );
    skullBone.rotation.z = opts.reverseFacing ? Math.PI / 2 : -Math.PI / 2;
    skullBone.position.set(opts.reverseFacing ? -0.25 : 0.25, 0.02, 0);
    skullBone.visible = false;
    headGroup.add(skullBone);
  }

  return {
    skeletonGroup,
    tailBones,
    limbBones,
    skullBone,
  };
}

/**
 * Applies the active Anatomy Mode ('skin' | 'skeleton')
 * to any built creature rig. Hard tissue (teeth, claws, horns, beaks) persists in every
 * layer like a real fossil; eyes and feathers are shown in skin view.
 */
export function applyAnatomyLayerToCreature(creatureRig, mode = 'skin') {
  if (!creatureRig) return;
  const { skinMeshes, anat, anatMats, eyes = [], appendageMeshes = [] } = creatureRig;

  const showSkinFull = mode === 'skin';
  const showSkeleton = !showSkinFull;

  skinMeshes.forEach(({ mesh, origMat }) => {
    mesh.visible = true;
    mesh.material = showSkinFull ? origMat : anatMats.ghostMat;
  });

  appendageMeshes.forEach((mesh) => {
    mesh.visible = showSkinFull;
  });
  eyes.forEach((eye) => eye.setVisible(showSkinFull));

  if (anat) {
    anat.skeletonGroup.visible = showSkeleton;
    if (anat.skullBone) anat.skullBone.visible = showSkeleton;
    anat.tailBones.forEach((b) => {
      b.visible = showSkeleton;
    });
    anat.limbBones.forEach((b) => {
      b.visible = showSkeleton;
    });
  }
}

// -----------------------------------------------------------------------------
// 3. HYPER-REAL REFINEMENT PASS (TESSELLATION + WORLD-SCALE UVS + SHADOWS)
// -----------------------------------------------------------------------------
function refineMeshGeometry(mesh) {
  const g = mesh.geometry;
  if (!g || !g.parameters || mesh.userData.noRefine) return;
  const p = g.parameters;
  const lockUV = Boolean(mesh.material?.userData?.lockUV);
  let ng = null;
  let uRep = 1;
  let vRep = 1;

  switch (g.type) {
    case 'CapsuleGeometry': {
      ng = new THREE.CapsuleGeometry(
        p.radius,
        p.height,
        Math.max(p.capSegments || 4, 10),
        Math.max(p.radialSegments || 8, 24),
        Math.max(p.heightSegments || 1, 3)
      );
      uRep = Math.max(1, Math.round((2 * Math.PI * p.radius) / TILE));
      vRep = Math.max(0.5, (p.height + 2 * p.radius) / TILE);
      break;
    }
    case 'SphereGeometry': {
      const phiLength = p.phiLength ?? Math.PI * 2;
      const thetaLength = p.thetaLength ?? Math.PI;
      ng = new THREE.SphereGeometry(
        p.radius,
        Math.max(p.widthSegments || 8, 32),
        Math.max(p.heightSegments || 6, 20),
        p.phiStart ?? 0,
        phiLength,
        p.thetaStart ?? 0,
        thetaLength
      );
      uRep = Math.max(1, Math.round((p.radius * phiLength) / TILE));
      vRep = Math.max(0.5, (p.radius * thetaLength) / TILE);
      break;
    }
    case 'ConeGeometry': {
      ng = new THREE.ConeGeometry(
        p.radius,
        p.height,
        Math.max(p.radialSegments || 8, 20),
        Math.max(p.heightSegments || 1, 3),
        p.openEnded,
        p.thetaStart ?? 0,
        p.thetaLength ?? Math.PI * 2
      );
      uRep = Math.max(1, Math.round((2 * Math.PI * p.radius) / TILE));
      vRep = Math.max(0.5, p.height / TILE);
      break;
    }
    case 'CylinderGeometry': {
      ng = new THREE.CylinderGeometry(
        p.radiusTop,
        p.radiusBottom,
        p.height,
        Math.max(p.radialSegments || 8, 20),
        Math.max(p.heightSegments || 1, 2),
        p.openEnded,
        p.thetaStart ?? 0,
        p.thetaLength ?? Math.PI * 2
      );
      const rr = Math.max(p.radiusTop, p.radiusBottom);
      uRep = Math.max(1, Math.round((2 * Math.PI * rr) / TILE));
      vRep = Math.max(0.5, p.height / TILE);
      break;
    }
    case 'TorusGeometry': {
      ng = new THREE.TorusGeometry(
        p.radius,
        p.tube,
        Math.max(p.radialSegments || 8, 14),
        Math.max(p.tubularSegments || 6, 40),
        p.arc ?? Math.PI * 2
      );
      uRep = Math.max(1, Math.round(((p.arc ?? Math.PI * 2) * p.radius) / TILE));
      vRep = Math.max(1, Math.round((2 * Math.PI * p.tube) / TILE));
      break;
    }
    default:
      return;
  }

  if (!lockUV && (uRep !== 1 || vRep !== 1)) {
    const uv = ng.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * uRep, uv.getY(i) * vRep);
    }
    uv.needsUpdate = true;
  }
  g.dispose();
  mesh.geometry = ng;
}

// =============================================================================
// MASTER SPECIES RIG DISPATCHER (ALL 29 PREHISTORIC SPECIES)
// =============================================================================
export function buildPrehistoricCreature(species, scale = 1.0, options = {}) {
  const cfg = species.rigConfig || {};
  const anatMats = createAnatomicalMaterials();
  let built;

  switch (species.rigType) {
    case 'sauropod':
      built = buildParametricSauropod(species, cfg, anatMats);
      break;
    case 'ceratopsian':
      built = buildParametricCeratopsian(species, cfg, anatMats);
      break;
    case 'stegosaur':
      built = buildParametricStegosaur(species, cfg, anatMats);
      break;
    case 'ankylosaur':
      built = buildParametricAnkylosaur(species, cfg, anatMats);
      break;
    case 'hadrosaur':
      built = buildParametricHadrosaur(species, cfg, anatMats);
      break;
    case 'synapsid':
      built = buildParametricSynapsid(species, cfg, anatMats);
      break;
    case 'pterosaur':
      built = buildParametricPterosaur(species, cfg, anatMats);
      break;
    case 'mosasaur':
    case 'ichthyosaur':
      built = buildParametricMarinePredator(species, cfg, anatMats);
      break;
    case 'plesiosaur':
      built = buildParametricPlesiosaur(species, cfg, anatMats);
      break;
    case 'avian':
      built = buildParametricAvian(species, cfg, anatMats);
      break;
    case 'theropod':
    default:
      built = buildParametricTheropod(species, cfg, anatMats);
      break;
  }

  // Hyper-real refinement: smooth tessellation, world-scale UVs, shadows, and layer bookkeeping
  const skinMeshes = [];
  const appendageMeshes = [];
  const hardTissueMeshes = [];
  const anatSet = new Set([anatMats.boneMat]);
  built.group.traverse((child) => {
    if (!child.isMesh) return;
    refineMeshGeometry(child);
    child.castShadow = !child.userData.noShadow;
    child.receiveShadow = true;
    if (child.userData.appendage) appendageMeshes.push(child);
    const isHard = Boolean(child.material?.userData?.hardTissue) || child.userData.hardTissue;
    if (isHard) {
      hardTissueMeshes.push(child);
    } else if (!anatSet.has(child.material) && !child.userData.eyePart) {
      skinMeshes.push({ mesh: child, origMat: child.material });
    }
  });

  built.group.scale.multiplyScalar(scale * (cfg.bodyScale || 1.0));
  built.skinMeshes = skinMeshes;
  built.appendageMeshes = appendageMeshes;
  built.hardTissueMeshes = hardTissueMeshes;
  built.eyes = built.eyes || [];
  built.anatMats = anatMats;
  built._activeLayer = 'skin';
  built._awaitingRealGLB = options.useRealGLB !== false;
  built.setAnatomyLayer = (layer) => {
    built._activeLayer = layer;
    applyAnatomyLayerToCreature(built, layer);
    if (built._awaitingRealGLB && !built.isRealGLB && layer === 'skin') {
      skinMeshes.forEach(({ mesh }) => {
        mesh.visible = false;
      });
      appendageMeshes.forEach((mesh) => {
        mesh.visible = false;
      });
      hardTissueMeshes.forEach((mesh) => {
        mesh.visible = false;
      });
      built.eyes.forEach((eye) => eye.setVisible(false));
    }
  };

  // Life layer: blinking + micro-saccades + vocalization lip-sync + gait events,
  // layered on top of each rig's locomotion cycle.
  const baseAnimate = built.animate;
  const lifeSeed = (hashString(species.id) % 1000) / 1000;
  const blinkPeriod = 3.2 + lifeSeed * 2.6;
  const gait = built.gait || { walk: 2.2, sprint: 4.2 };
  let vocalStart = -Infinity;
  let vocalEnd = -Infinity;
  let lastGaitPhase = null;

  /** Opens the jaw / throws the head for `duration` seconds (driven by the audio engine). */
  built.vocalize = (duration = 1.5, delay = 0) => {
    built._pendingVocal = { duration: Math.max(0.3, duration), delay: Math.max(0, delay) };
  };
  /** Callback (footIndex, intensity, locomotion) fired on each footfall / wing-beat. */
  built.onStep = null;

  built.animate = (time, whatIf = false) => {
    baseAnimate(time, whatIf);

    if (built._pendingVocal) {
      vocalStart = time + built._pendingVocal.delay;
      vocalEnd = vocalStart + built._pendingVocal.duration;
      built._pendingVocal = null;
    }
    let vocal = 0;
    if (time >= vocalStart && time <= vocalEnd + 0.35) {
      const attack = Math.min(1, (time - vocalStart) / 0.16);
      const release = Math.min(1, Math.max(0, (vocalEnd + 0.35 - time) / 0.35));
      const tremor = 0.78 + 0.22 * Math.sin(time * 15.0 + lifeSeed * 3);
      vocal = Math.min(attack, release) * tremor;
      if (built.jawPivot) {
        built.jawPivot.rotation.z = Math.min(built.jawPivot.rotation.z, -0.62 * vocal);
      }
      if (built.headGroup) {
        built.headGroup.rotation.z += 0.24 * vocal;
      }
    }

    // Gait events: two footfalls per stride (bipeds) / four (quadrupeds) / one flap (flyers)
    if (built.onStep && built.locomotion !== 'swim') {
      const spd = whatIf ? gait.sprint : gait.walk;
      const beats = built.locomotion === 'quad' ? 4 : built.locomotion === 'fly' ? 1 : 2;
      const phase = Math.floor(((time * spd) / (Math.PI * 2)) * beats);
      if (lastGaitPhase !== null && phase !== lastGaitPhase) {
        built.onStep(phase % beats, whatIf ? 1.0 : 0.55, built.locomotion);
      }
      lastGaitPhase = phase;
    }

    if (!built.eyes.length) return;
    const phase = (time + lifeSeed * 7.0) % blinkPeriod;
    const blink = phase < 0.17 ? Math.sin((phase / 0.17) * Math.PI) : 0;
    const alert = whatIf ? 0.45 : 1.0;
    const yaw = (Math.sin(time * 0.7 + lifeSeed * 9) * 0.07 + Math.sin(time * 2.3 + lifeSeed * 4) * 0.03) * alert;
    const pitch = (Math.cos(time * 0.9 + lifeSeed * 5) * 0.04) * alert;
    const squint = Math.max(blink * (whatIf ? 0.3 : 1.0), vocal * 0.35);
    built.eyes.forEach((eye) => eye.update(squint, yaw, pitch));
  };

  // Upgrade with the real sculpted & PBR-textured .glb 3D model from ./vendor/models/
  if (options.useRealGLB !== false) {
    // Hide procedural outer meshes while the real .glb loads (~30ms on localhost) so
    // the procedural fallback never flashes before the real 3D model appears.
    skinMeshes.forEach(({ mesh }) => {
      mesh.visible = false;
    });
    appendageMeshes.forEach((mesh) => {
      mesh.visible = false;
    });
    hardTissueMeshes.forEach((mesh) => {
      mesh.visible = false;
    });
    built.eyes.forEach((eye) => eye.setVisible(false));

    built.realGLBPromise = upgradeRigWithRealGLB(built, species, scale, (upgradedRig, normSize) => {
      if (typeof options.onRealGLBReady === 'function') {
        options.onRealGLBReady(upgradedRig, normSize);
      }
    }).then((res) => {
      if (!res && !built._disposed) {
        // Restore procedural meshes only if the .glb failed to load
        hardTissueMeshes.forEach((mesh) => {
          mesh.visible = true;
        });
        applyAnatomyLayerToCreature(built, built._activeLayer || 'skin');
      }
      return res;
    });
  }

  return built;
}

// -----------------------------------------------------------------------------
// 1. PARAMETRIC THEROPOD RIG (T-Rex, Spinosaurus, Velociraptor, Deinonychus,
//    Allosaurus, Dilophosaurus, Carnotaurus, Therizinosaurus, Coelophysis,
//    Herrerasaurus, Eoraptor)
// -----------------------------------------------------------------------------
function buildParametricTheropod(species, cfg, anatMats) {
  const root = new THREE.Group();
  const feathered = Boolean(cfg.hasFeathers);

  const skinMat = makePBRMaterial(
    `thero_${species.id}`,
    cfg.primaryColor || '#5c2d16',
    '#1c1917',
    skinOptions(species, cfg, { roughness: feathered ? 0.68 : 0.54, bumpScale: 0.13 })
  );
  const accentMat = makePBRMaterial(`theroAcc_${species.id}`, cfg.accentColor || '#f59e0b', '#7c2d12', {
    style: cfg.hasSail ? 'sail' : 'scales',
    roughness: 0.44,
    doubleSide: true,
    naturalize: 'accent',
    pattern: 'mottle',
    seed: (hashString(species.id) % 500) + 11,
  });
  const featherCardMat = feathered
    ? makeFeatherCardMaterial(
        `theroPlume_${species.id}`,
        cfg.featherColor || cfg.accentColor || '#f97316',
        cfg.secondaryColor || '#fef3c7'
      )
    : null;
  const toothMat = makeKeratinMaterial('tooth', { gradientAxis: 'u' });
  const clawMat = makeKeratinMaterial('claw');
  const beakMat = makeKeratinMaterial('beak', { gradientAxis: 'u' });
  const mouthMat = makeSoftTissueMaterial('#591622', { roughness: 0.42, clearcoat: 0.6 });

  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.36, 0);
  root.add(pelvisGroup);

  const bellyBulge = cfg.isPotBellied ? 1.32 : 1.0;
  const tailLen = cfg.tailLen || 1.0;
  const neckLen = cfg.neckLen || 1.0;
  const paddle = Boolean(cfg.hasPaddleTail);

  // Unified continuous sculpted body: tail tip (u=0) → caudofemoralis tail base → pelvis → deep ribcage → chest → S-curved neck (u=1)
  const spineStations = [
    { pos: V3(-2.85 * tailLen, 0.14, 0), rx: paddle ? 0.09 : 0.028, ry: 0.024, dorsalRidge: paddle ? 0.35 : 0.12, ventral: 0.3 },
    { pos: V3(-2.25 * tailLen, 0.12, 0), rx: paddle ? 0.19 : 0.085, ry: paddle ? 0.055 : 0.075, dorsalRidge: paddle ? 0.38 : 0.14, ventral: 0.45 },
    { pos: V3(-1.55 * tailLen, 0.1, 0), rx: paddle ? 0.27 : 0.17, ry: paddle ? 0.11 : 0.15, dorsalRidge: paddle ? 0.32 : 0.15, ventral: 0.6 },
    { pos: V3(-0.92 * tailLen, 0.09, 0), rx: 0.3, ry: 0.25, dorsalRidge: 0.16, ribBulge: 0.1, ventral: 0.75 },
    { pos: V3(-0.42, 0.12, 0), rx: 0.44 * bellyBulge, ry: 0.36 * bellyBulge, dorsalRidge: 0.16, ribBulge: 0.16, bellyFlat: 0.08, ventral: 0.9 },
    { pos: V3(0.14, 0.16, 0), rx: 0.54 * bellyBulge, ry: 0.43 * bellyBulge, dorsalRidge: 0.15, ribBulge: 0.22, bellyFlat: 0.1, keel: 0.08, ventral: 1.0 },
    { pos: V3(0.64, 0.28, 0), rx: 0.42, ry: 0.35, dorsalRidge: 0.14, ribBulge: 0.16, bellyFlat: 0.12, keel: 0.06, ventral: 0.95 },
    { pos: V3(0.86 + 0.12 * neckLen, 0.44 + 0.12 * neckLen, 0), rx: 0.31, ry: 0.25, dorsalRidge: 0.14, ribBulge: 0.08, ventral: 0.85 },
    { pos: V3(0.96 + 0.28 * neckLen, 0.62 + 0.32 * neckLen, 0), rx: 0.26, ry: 0.21, dorsalRidge: 0.12, ventral: 0.75 },
    { pos: V3(1.06 + 0.42 * neckLen, 0.74 + 0.48 * neckLen, 0), rx: 0.23, ry: 0.19, dorsalRidge: 0.1, ventral: 0.6 },
  ];

  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 38,
    tubularSegments: 84,
    tailEndU: 0.44,
    neckStartU: 0.72,
    tailSegmentCount: 8,
  });
  pelvisGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => pelvisGroup.add(s));

  // Spinosaurus continuous dorsal sail + continuous caudal paddle-tail fin ribbon
  if (cfg.hasSail) {
    const sailH = cfg.sailHeight || 1.18;
    const profile = (u) => Math.max(0.08, Math.sin(u * Math.PI) * (1.0 - 0.16 * Math.sin(u * Math.PI * 3)) * sailH);
    const sail = buildSailMembrane({
      x0: -0.78,
      x1: 0.76,
      baseYAt: (u) => 0.42 + u * 0.16,
      heightAt: profile,
      material: accentMat,
      segments: 38,
      rows: 10,
    });
    pelvisGroup.add(sail);
    for (let i = 0; i < 15; i++) {
      const u = i / 14;
      const spineH = profile(u) * 0.96;
      const rod = buildLoftedOrganMesh(
        [V3(-0.76 + u * 1.5, 0.34 + u * 0.16, 0), V3(-0.78 + u * 1.5, 0.42 + u * 0.16 + spineH, 0)],
        [{ rx: 0.026, ry: 0.022 }, { rx: 0.008, ry: 0.008 }],
        skinMat,
        10,
        8
      );
      pelvisGroup.add(rod);
    }
  } else if (feathered) {
    for (let i = 0; i < 11; i++) {
      const u = i / 10;
      const tuft = buildFeatherFan(featherCardMat, {
        count: 4,
        length: 0.18 + 0.06 * Math.sin(u * Math.PI),
        width: 0.058,
        spread: Math.PI * 0.24,
        taper: 0.22,
        curl: 0.16,
      });
      tuft.position.set(-0.68 + u * 1.48, 0.56 + u * 0.22, 0);
      orientYToward(tuft, new THREE.Vector3(-0.55, 0.84, 0), new THREE.Vector3(0, 0, 1));
      tuft.traverse((c) => {
        if (c.isMesh) c.userData.appendage = true;
      });
      pelvisGroup.add(tuft);
    }
  } else {
    // Low median dermal scute row along the back
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const scute = buildStegoPlate(0.065 + 0.03 * Math.sin(u * Math.PI), 0.09, 0.024, accentMat);
      scute.position.set(-0.85 + u * 1.62, 0.48 + u * 0.16, 0);
      scute.rotation.z = -0.18;
      pelvisGroup.add(scute);
    }
  }

  // Dromaeosaur tail fan mounted on the continuous tail tip
  if (feathered) {
    const halfSpread = Math.PI * 0.25;
    [1, -1].forEach((sideSign) => {
      const half = buildFeatherFan(featherCardMat, {
        count: 8,
        length: 0.62 * tailLen,
        width: 0.098,
        spread: halfSpread,
        startAngle: sideSign > 0 ? 0.02 : -(0.02 + halfSpread),
        taper: 0.28,
        curl: 0.05,
      });
      half.position.set(0.35 * tailLen, 0.02, 0);
      orientYToward(half, new THREE.Vector3(-1, 0.04, 0), new THREE.Vector3(0, 1, 0));
      half.rotateY(sideSign * 0.55);
      half.traverse((c) => {
        if (c.isMesh) c.userData.appendage = true;
      });
      spineBody.tailTipMount.add(half);
    });
  }

  // Sculpted Skull + Articulated Mandible mounted seamlessly on spineBody.headMount
  const skScale = cfg.skullScale || 1.0;
  const isSpino = Boolean(cfg.snoutNarrow);
  const isHerbivoreThero = Boolean(cfg.isPotBellied); // Therizinosaurus
  const isBeakOnly = Boolean(cfg.hasBeakOnly); // Gallimimus, Oviraptor, Gastornis
  const { headGroup, jawPivot } = buildSculptedSkull({
    length: (isSpino ? 1.12 : 0.94) * skScale,
    height: (isSpino ? 0.29 : 0.4) * skScale,
    width: (isSpino ? 0.16 : 0.26) * skScale,
    snoutTaper: isSpino ? 0.34 : isHerbivoreThero || isBeakOnly ? 0.44 : 0.62,
    snoutDrop: isSpino ? -0.04 : -0.02,
    browRidge: isSpino ? 0.12 : 0.22,
    nasalBoss: isSpino ? 0.14 : 0.1,
    premaxNotch: isSpino ? 0.85 : 0.15,
    jugalFlare: isSpino ? 0.1 : 0.22,
    jawDepth: isSpino ? 0.34 : 0.46,
    toothCount: isBeakOnly ? 0 : isHerbivoreThero ? 4 : Math.min(11, Math.max(6, Math.floor((cfg.toothCount || 14) / 2))),
    toothLength: (isSpino ? 0.095 : 0.082) * skScale,
    toothRadius: (isSpino ? 0.015 : 0.018) * skScale,
    toothCurl: isSpino ? 0.12 : 0.28,
    hasBeak: isHerbivoreThero || isBeakOnly,
    beakHook: isBeakOnly && cfg.crestType === 'cassowary_casque' ? 0.09 : 0.04,
    skinMat,
    darkMat: accentMat,
    toothMat,
    beakMat,
    palateMat: mouthMat,
  });
  headGroup.position.set(-0.08 * skScale, -0.06 * skScale, 0);
  spineBody.headMount.add(headGroup);

  // Species-specific Cranial Crests & Horns (Dilophosaurus, Allosaurus, Carnotaurus, Spinosaurus, Pachycephalosaurus, Stygimoloch, Oviraptor, Cryolophosaurus, Ceratosaurus, Yutyrannus)
  if (cfg.hasCrest) {
    const hornMat = makeKeratinMaterial('darkHorn', { gradientAxis: 'u' });
    if (cfg.crestType === 'double_parallel') {
      [-0.075, 0.075].forEach((zOff) => {
        const crest = buildStegoPlate(0.24 * skScale, 0.48 * skScale, 0.025 * skScale, accentMat);
        crest.position.set(0.42 * skScale, 0.16 * skScale, zOff);
        crest.rotation.x = zOff * 2.2;
        headGroup.add(crest);
      });
    } else if (cfg.crestType === 'bull_horns') {
      [-1, 1].forEach((side) => {
        const horn = buildLoftedOrganMesh(
          [
            V3(0.16 * skScale, 0.22 * skScale, side * 0.16 * skScale),
            V3(0.14 * skScale, 0.34 * skScale, side * 0.34 * skScale),
            V3(0.12 * skScale, 0.42 * skScale, side * 0.48 * skScale),
          ],
          [{ rx: 0.075 * skScale, ry: 0.075 * skScale }, { rx: 0.048 * skScale, ry: 0.048 * skScale }, { rx: 0.008, ry: 0.008 }],
          hornMat,
          14,
          12,
          { unit: true, noVentral: true }
        );
        horn.userData.hardTissue = true;
        headGroup.add(horn);
      });
    } else if (cfg.crestType === 'brow_horns') {
      [-1, 1].forEach((side) => {
        const horn = buildStegoPlate(0.14 * skScale, 0.16 * skScale, 0.045 * skScale, hornMat);
        horn.position.set(0.24 * skScale, 0.22 * skScale, side * 0.15 * skScale);
        horn.rotation.x = side * 0.25;
        headGroup.add(horn);
      });
    } else if (cfg.crestType === 'nasal_and_brow_horns') {
      // Ceratosaurus blade-like median nasal horn + twin brow hornlets
      const nasalBlade = buildStegoPlate(0.22 * skScale, 0.24 * skScale, 0.042 * skScale, hornMat);
      nasalBlade.position.set(0.64 * skScale, 0.15 * skScale, 0);
      nasalBlade.userData.hardTissue = true;
      headGroup.add(nasalBlade);
      [-1, 1].forEach((side) => {
        const bHorn = buildStegoPlate(0.11 * skScale, 0.12 * skScale, 0.036 * skScale, hornMat);
        bHorn.position.set(0.24 * skScale, 0.21 * skScale, side * 0.14 * skScale);
        bHorn.rotation.x = side * 0.22;
        headGroup.add(bHorn);
      });
    } else if (cfg.crestType === 'elvis_pompadour') {
      // Cryolophosaurus transverse fluted fan crest across the brow
      const pomp = buildStegoPlate(0.28 * skScale, 0.36 * skScale, 0.04 * skScale, accentMat);
      pomp.position.set(0.22 * skScale, 0.2 * skScale, 0);
      pomp.rotation.y = Math.PI / 2;
      pomp.rotation.z = 0.25;
      headGroup.add(pomp);
    } else if (cfg.crestType === 'cassowary_casque') {
      // Oviraptor tall cassowary-like hollow cranial casque
      const casque = buildStegoPlate(0.32 * skScale, 0.44 * skScale, 0.08 * skScale, accentMat);
      casque.position.set(0.42 * skScale, 0.16 * skScale, 0);
      headGroup.add(casque);
    } else if (cfg.crestType === 'bone_dome' || cfg.crestType === 'stygimoloch_horns') {
      // Pachycephalosaurus & Stygimoloch 25cm-thick frontoparietal bone dome + squamosal crown spikes
      const isStygi = cfg.crestType === 'stygimoloch_horns';
      const dome = buildLoftedOrganMesh(
        [
          V3(-0.04 * skScale, 0.16 * skScale, 0),
          V3(0.18 * skScale, (isStygi ? 0.48 : 0.42) * skScale, 0),
          V3(0.42 * skScale, 0.18 * skScale, 0),
        ],
        [
          { rx: 0.16 * skScale, ry: 0.18 * skScale },
          { rx: (isStygi ? 0.26 : 0.24) * skScale, ry: (isStygi ? 0.18 : 0.24) * skScale },
          { rx: 0.12 * skScale, ry: 0.14 * skScale },
        ],
        hornMat,
        20,
        14,
        { unit: true, noVentral: true }
      );
      dome.userData.hardTissue = true;
      headGroup.add(dome);
      for (let k = -3; k <= 3; k++) {
        if (k === 0) continue;
        const spLen = isStygi && Math.abs(k) >= 2 ? 0.36 * skScale : 0.12 * skScale;
        const sp = buildLoftedOrganMesh(
          [
            V3(0.02 * skScale, 0.18 * skScale, k * 0.065 * skScale),
            V3(-spLen, (0.22 + Math.abs(k) * 0.03) * skScale, k * 0.12 * skScale),
          ],
          [{ rx: 0.038 * skScale, ry: 0.038 * skScale }, { rx: 0.006, ry: 0.006 }],
          hornMat,
          10,
          8,
          { unit: true, noVentral: true }
        );
        sp.userData.hardTissue = true;
        headGroup.add(sp);
      }
    } else if (cfg.crestType === 'spino_crest') {
      const spinoCrest = buildStegoPlate(0.16 * skScale, 0.34 * skScale, 0.036 * skScale, accentMat);
      spinoCrest.position.set(0.46 * skScale, 0.18 * skScale, 0);
      headGroup.add(spinoCrest);
    }
  } else if (isSpino) {
    // Spinosaurus median preorbital nasal crest
    const spinoCrest = buildStegoPlate(0.14 * skScale, 0.28 * skScale, 0.032 * skScale, accentMat);
    spinoCrest.position.set(0.42 * skScale, 0.18 * skScale, 0);
    headGroup.add(spinoCrest);
  }

  const snoutW = isSpino ? 0.58 : 1.0;
  const eyes = attachEyes(headGroup, skinMat, {
    x: 0.22 * skScale,
    y: 0.15 * skScale,
    z: 0.21 * skScale * snoutW,
    radius: 0.046 * skScale,
    preset: feathered ? EYE_PRESETS.feathered : EYE_PRESETS.theropod,
    gazeForward: 0.42,
    gazeUp: 0.06,
  });
  attachNostrils(headGroup, {
    x: (isSpino ? 0.62 : 0.82) * skScale,
    y: 0.08 * skScale,
    z: 0.075 * skScale * snoutW,
    r: 0.02 * skScale,
  });

  // Sculpted 2-Jointed Forelimbs (+ Pennaceous Wing Fans or 1m Therizinosaurus Scythe Claws)
  const forelimbs = [];
  const armScale = cfg.armScale || 1.0;
  const clawScale = cfg.clawScale || 1.0;
  const legBoneGroups = [];

  [-1, 1].forEach((side) => {
    const arm = buildArticulatedLimb({
      side,
      thighLen: 0.26 * armScale,
      shinLen: 0.24 * armScale,
      footLen: 0.14 * armScale,
      thighR: 0.072 * armScale,
      shinR: 0.052 * armScale,
      toeCount: cfg.armScale && cfg.armScale < 0.6 ? 2 : 3,
      clawLen: 0.11 * clawScale,
      clawR: 0.022 * clawScale,
      digitigrade: false,
      skinMat,
      clawMat,
      legBoneGroups,
    });
    arm.hipGroup.position.set(0.68, 0.08, side * 0.31);
    arm.hipGroup.rotation.z = 0.52;
    arm.kneeGroup.rotation.z = 0.72;

    if (feathered) {
      const trailing = new THREE.Vector3(-0.62, -0.78, 0);
      const wingUp = new THREE.Vector3(0, 0, side);
      const remiges = buildFeatherFan(featherCardMat, {
        count: 12,
        length: 0.52 * armScale,
        width: 0.105 * armScale,
        spread: Math.PI * 0.46,
        taper: 0.25,
        curl: 0.1,
      });
      remiges.position.set(0.02, -0.14 * armScale, side * 0.03);
      orientYToward(remiges, trailing, wingUp);
      const coverts = buildFeatherFan(featherCardMat, {
        count: 9,
        length: 0.3 * armScale,
        width: 0.088 * armScale,
        spread: Math.PI * 0.42,
        taper: 0.2,
        curl: 0.14,
      });
      coverts.position.set(0.03, -0.12 * armScale, side * 0.045);
      orientYToward(coverts, trailing, wingUp);
      [remiges, coverts].forEach((fan) => {
        fan.traverse((c) => {
          if (c.isMesh) c.userData.appendage = true;
        });
        arm.kneeGroup.add(fan);
      });
    }

    pelvisGroup.add(arm.hipGroup);
    forelimbs.push(arm.hipGroup);
  });

  // 2 Sculpted 3-Joint Digitigrade Hind Legs (+ Dromaeosaur Raised Sickle Claw)
  const legs = [];
  [-1, 1].forEach((side, idx) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.72,
      shinLen: 0.66,
      footLen: 0.36,
      thighR: 0.28,
      shinR: 0.145,
      toeCount: 3,
      clawLen: 0.14,
      clawR: 0.032,
      sickleClaw: Boolean(cfg.hasSickleClaw),
      digitigrade: true,
      skinMat,
      clawMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(-0.24, 0.02, side * 0.32);
    pelvisGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase: idx * Math.PI });
  });

  const anat = attachInternalAnatomyAndSkeleton(pelvisGroup, headGroup, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup,
    jawPivot,
    gait: { walk: 2.5, sprint: 4.8 },
    locomotion: 'biped',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const speed = whatIf ? 4.8 : 2.5;
      const cycle = time * speed;

      pelvisGroup.position.y = 0.36 + Math.abs(Math.sin(cycle)) * 0.1;
      pelvisGroup.rotation.z = Math.sin(cycle) * 0.048 + (whatIf && cfg.isPotBellied ? 0.24 : 0);
      pelvisGroup.rotation.x = Math.cos(cycle) * 0.035;

      const neckPitch = Math.sin(time * 1.9) * 0.09 + (whatIf ? 0.12 : 0);
      const neckYaw = Math.sin(time * 1.3) * 0.11;
      spineBody.deform(time, {
        speed,
        tailSwayZ: paddle ? 0.34 : 0.22,
        tailSwayY: 0.04,
        neckPitch,
        neckYaw,
        breath: Math.sin(time * 3.0) * 0.03,
      });

      headGroup.rotation.z = Math.cos(time * 2.4) * 0.09;
      headGroup.rotation.y = neckYaw * 0.85;

      const roarWave = whatIf
        ? 0.36 + Math.abs(Math.sin(time * 7.2)) * 0.34
        : Math.max(0, Math.sin(time * 1.9 - 0.3)) * 0.32;
      jawPivot.rotation.z = -roarWave;

      forelimbs.forEach((arm, idx) => {
        arm.rotation.z = 0.52 + Math.sin(time * (whatIf ? 7 : 3.6) + idx) * (whatIf ? 0.35 : 0.16);
      });

      legs.forEach(({ hipGroup, kneeGroup, footGroup, phase }) => {
        const s = Math.sin(cycle + phase);
        const c = Math.cos(cycle + phase);
        hipGroup.rotation.z = s * 0.38;
        kneeGroup.rotation.z = -Math.max(0, c) * 0.48 - 0.08;
        footGroup.rotation.z = -hipGroup.rotation.z * 0.65;
      });

    },
  };
}

// -----------------------------------------------------------------------------
// 2. PARAMETRIC SAUROPOD RIG (Brachiosaurus, Diplodocus, Argentinosaurus, Plateosaurus, Amargasaurus, etc.)
// -----------------------------------------------------------------------------
function buildParametricSauropod(species, cfg, anatMats) {
  const root = new THREE.Group();
  const skinMat = makePBRMaterial(
    `sauro_${species.id}`,
    cfg.primaryColor || '#15803d',
    '#052e16',
    skinOptions(species, cfg, { roughness: 0.58, bumpScale: 0.14, cells: 24 })
  );
  const accentMat = makePBRMaterial(`sauroAcc_${species.id}`, cfg.accentColor || '#eab308', '#ca8a04', {
    style: 'scales',
    roughness: 0.48,
    naturalize: 'accent',
    cells: 16,
    seed: (hashString(species.id) % 500) + 7,
  });
  const nailMat = makeKeratinMaterial('hoof');
  const toothMat = makeKeratinMaterial('tooth', { gradientAxis: 'u' });
  const mouthMat = makeSoftTissueMaterial('#591622');

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = -0.22;
  root.add(bodyGroup);

  const fScale = cfg.frontLegScale || 1.0;
  const frontLift = fScale > 1.1 ? 0.34 : 0.06;
  const nScale = cfg.neckLen || 1.15;
  const tScale = cfg.tailLen || 1.0;
  const highNeck = (cfg.neckAngle || 0) > -0.15 && fScale >= 1.0;

  // ONE continuous seamless loft from whip-tail tip through pelvis, barrel chest, and sweeping S-neck!
  const spineStations = [
    { pos: V3(-2.75 * tScale, -0.26, 0), rx: 0.028, ry: 0.028, dorsalRidge: 0.14, ventral: 0.2 },
    { pos: V3(-2.05 * tScale, -0.22, 0), rx: 0.095, ry: 0.09, dorsalRidge: 0.16, ventral: 0.4 },
    { pos: V3(-1.35 * tScale, -0.16, 0), rx: 0.22, ry: 0.2, dorsalRidge: 0.16, ventral: 0.65 },
    { pos: V3(-0.78, -0.06, 0), rx: 0.44, ry: 0.42, dorsalRidge: 0.15, ribBulge: 0.16, ventral: 0.85 },
    { pos: V3(-0.15, 0.08, 0), rx: 0.66, ry: 0.64, dorsalRidge: 0.14, ribBulge: 0.26, bellyFlat: 0.12, keel: 0.08, ventral: 1.0 },
    { pos: V3(0.54, frontLift + 0.08, 0), rx: 0.56, ry: 0.52, dorsalRidge: 0.16, ribBulge: 0.2, bellyFlat: 0.1, keel: 0.12, ventral: 0.95 },
    {
      pos: V3(0.95 + 0.22 * nScale, frontLift + (highNeck ? 0.48 : 0.24) * nScale, 0),
      rx: 0.34,
      ry: 0.28,
      dorsalRidge: 0.15,
      keel: 0.1,
      ventral: 0.9,
    },
    {
      pos: V3(1.28 + 0.48 * nScale, frontLift + (highNeck ? 1.02 : 0.46) * nScale, 0),
      rx: 0.24,
      ry: 0.2,
      dorsalRidge: 0.14,
      keel: 0.06,
      ventral: 0.85,
    },
    {
      pos: V3(1.52 + 0.72 * nScale, frontLift + (highNeck ? 1.54 : 0.66) * nScale, 0),
      rx: 0.17,
      ry: 0.15,
      dorsalRidge: 0.12,
      ventral: 0.75,
    },
  ];

  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 38,
    tubularSegments: 88,
    tailEndU: 0.42,
    neckStartU: 0.64,
    tailSegmentCount: 8,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  // Optional Titanosaur Osteoderm Armor Scutes (Argentinosaurus), Diplodocid Back Spines, or Amargasaurus Twin Neck Sails
  if (cfg.hasOsteoderms) {
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      [-0.42, 0.42].forEach((zSide) => {
        const scute = buildStegoPlate(0.09, 0.14, 0.08, accentMat);
        scute.position.set(-0.62 + u * 1.15, 0.46 + u * frontLift * 0.5, zSide);
        scute.rotation.x = (zSide > 0 ? 1 : -1) * 0.45;
        bodyGroup.add(scute);
      });
    }
  }
  if (cfg.hasNeckSails) {
    // Amargasaurus twin parallel rows of 65cm neural-spine sails along the neck & back
    const hornMat = makeKeratinMaterial('horn', { gradientAxis: 'u' });
    [-0.08, 0.08].forEach((zRow) => {
      for (let i = 0; i < 12; i++) {
        const u = 0.54 + (i / 11) * 0.41;
        const pt = spineBody.curve.getPointAt(u);
        const h = 0.24 + 0.34 * Math.sin(((i + 1) / 12) * Math.PI);
        const spine = buildLoftedOrganMesh(
          [V3(pt.x, pt.y + 0.12, zRow), V3(pt.x - 0.14, pt.y + 0.12 + h, zRow * 1.5)],
          [{ rx: 0.032, ry: 0.026 }, { rx: 0.006, ry: 0.006 }],
          hornMat,
          10,
          8,
          { unit: true, noVentral: true }
        );
        spine.userData.hardTissue = true;
        bodyGroup.add(spine);
      }
    });
  }
  if (cfg.hasBackSpines) {
    for (let i = 0; i < 16; i++) {
      const u = 0.08 + (i / 15) * 0.84;
      const pt = spineBody.curve.getPointAt(u);
      const sp = buildStegoPlate(0.08 + 0.06 * Math.sin(u * Math.PI), 0.07, 0.02, accentMat);
      sp.position.set(pt.x, pt.y + 0.18 + 0.32 * Math.sin(u * Math.PI), 0);
      sp.rotation.z = -0.25;
      bodyGroup.add(sp);
    }
  }

  // Sculpted Sauropod Skull + Articulated Jaw mounted on spineBody.headMount
  const { headGroup, jawPivot } = buildSculptedSkull({
    length: 0.54,
    height: 0.24,
    width: 0.17,
    snoutTaper: 0.68,
    snoutDrop: -0.05,
    browRidge: 0.14,
    nasalBoss: cfg.hasCrest ? 0.42 : 0.1,
    jugalFlare: 0.12,
    jawDepth: 0.36,
    toothCount: 6,
    toothLength: 0.032,
    toothRadius: 0.008,
    toothCurl: 0.08,
    skinMat,
    darkMat: accentMat,
    toothMat,
    palateMat: mouthMat,
  });
  headGroup.position.set(-0.04, -0.04, 0);
  spineBody.headMount.add(headGroup);

  if (cfg.hasCrest) {
    // Macronarian high arched nasal dome (Brachiosaurus)
    const domePts = [V3(0.02, 0.1, 0), V3(0.14, 0.24, 0), V3(0.28, 0.12, 0)];
    const domeR = [
      { rx: 0.08, ry: 0.07, ventral: 0 },
      { rx: 0.12, ry: 0.085, dorsalRidge: 0.2, ventral: 0 },
      { rx: 0.06, ry: 0.06, ventral: 0 },
    ];
    headGroup.add(buildLoftedOrganMesh(domePts, domeR, accentMat, 20, 16, { noVentral: true }));
    attachNostrils(headGroup, { x: 0.22, y: 0.19, z: 0.055, r: 0.018 });
  } else {
    attachNostrils(headGroup, { x: 0.42, y: 0.04, z: 0.055, r: 0.016 });
  }

  const eyes = attachEyes(headGroup, skinMat, {
    x: 0.14,
    y: 0.09,
    z: 0.145,
    radius: 0.032,
    preset: EYE_PRESETS.sauropod,
    gazeForward: 0.24,
    gazeUp: 0.04,
  });

  // 4 Sculpted Muscular Pillar Legs with Elephantine Foot Pads & Hoof Nails
  const legs = [];
  const legBoneGroups = [];
  [
    [0.52, frontLift - 0.06, 0.38, 0, fScale, 1],
    [0.52, frontLift - 0.06, -0.38, Math.PI, fScale, -1],
    [-0.56, -0.08, 0.36, Math.PI * 0.5, 0.96, 1],
    [-0.56, -0.08, -0.36, Math.PI * 1.5, 0.96, -1],
  ].forEach(([lx, ly, lz, phase, lenScale, side]) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.54 * lenScale,
      shinLen: 0.52 * lenScale,
      footLen: 0.26,
      thighR: 0.23,
      shinR: 0.175,
      toeCount: 4,
      clawLen: 0.075,
      clawR: 0.028,
      hoofed: true,
      digitigrade: false,
      skinMat,
      clawMat: nailMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(lx, ly, lz);
    bodyGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headGroup, spineBody.tailSegments, legBoneGroups, anatMats, {
    ribRadius: 0.48,
  });

  return {
    group: root,
    headGroup,
    jawPivot,
    gait: { walk: 1.5, sprint: 2.8 },
    locomotion: 'quad',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 2.8 : 1.5;
      const cyc = time * spd;

      bodyGroup.position.y = -0.22 + Math.abs(Math.sin(cyc)) * 0.055;
      bodyGroup.rotation.z = Math.sin(cyc) * 0.028 + (whatIf && fScale < 0.85 ? 0.24 : 0);

      const neckPitch = Math.sin(time * 1.4) * 0.12 + (whatIf ? 0.08 : 0);
      const neckYaw = Math.cos(time * 1.1) * 0.14;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: whatIf && tScale > 1.2 ? 0.42 : 0.24,
        tailSwayY: 0.04,
        neckPitch,
        neckYaw,
        breath: Math.sin(time * 2.2) * 0.028,
      });

      headGroup.rotation.z = Math.sin(time * 2.2) * 0.1;
      headGroup.rotation.y = neckYaw * 0.7;
      jawPivot.rotation.z = -Math.max(0, Math.sin(time * 1.7 - 0.5)) * 0.18;

      legs.forEach(({ hipGroup, kneeGroup, phase }) => {
        const s = Math.sin(cyc + phase);
        hipGroup.rotation.z = s * 0.26;
        kneeGroup.rotation.z = Math.max(0, -Math.cos(cyc + phase)) * 0.34;
      });

    },
  };
}

// -----------------------------------------------------------------------------
// 3. PARAMETRIC CERATOPSIAN RIG (Triceratops)
// -----------------------------------------------------------------------------
function buildParametricCeratopsian(species, cfg, anatMats) {
  const root = new THREE.Group();
  const skinMat = makePBRMaterial(
    `cera_${species.id}`,
    cfg.primaryColor || '#57534e',
    '#1c1917',
    skinOptions(species, cfg, { roughness: 0.56, bumpScale: 0.14, cells: 20 })
  );
  const frillMat = makePBRMaterial(`ceraFrill_${species.id}`, cfg.accentColor || '#d97706', '#7c2d12', {
    style: 'scales',
    roughness: 0.48,
    naturalize: 'accent',
    pattern: 'spots',
    patternStrength: 0.65,
    cells: 16,
    seed: (hashString(species.id) % 500) + 5,
  });
  const hornMat = makeKeratinMaterial('horn', { gradientAxis: 'u' });
  const beakMat = makeKeratinMaterial('beak', { gradientAxis: 'u' });
  const nailMat = makeKeratinMaterial('hoof');
  const mouthMat = makeSoftTissueMaterial('#591622');

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.08;
  root.add(bodyGroup);

  // Continuous sculpted body: heavy tail tip → muscular pelvis → high-arched sacral back → deep barrel chest → thick muscular neck
  const spineStations = [
    { pos: V3(-2.15, -0.1, 0), rx: 0.032, ry: 0.032, dorsalRidge: 0.14, ventral: 0.25 },
    { pos: V3(-1.55, -0.06, 0), rx: 0.14, ry: 0.13, dorsalRidge: 0.16, ventral: 0.5 },
    { pos: V3(-0.98, 0.02, 0), rx: 0.3, ry: 0.28, dorsalRidge: 0.18, ribBulge: 0.14, ventral: 0.8 },
    { pos: V3(-0.32, 0.16, 0), rx: 0.58, ry: 0.56, dorsalRidge: 0.18, ribBulge: 0.26, bellyFlat: 0.12, ventral: 1.0 },
    { pos: V3(0.38, 0.12, 0), rx: 0.54, ry: 0.52, dorsalRidge: 0.16, ribBulge: 0.24, bellyFlat: 0.12, keel: 0.1, ventral: 1.0 },
    { pos: V3(0.84, 0.06, 0), rx: 0.38, ry: 0.36, dorsalRidge: 0.12, ribBulge: 0.14, ventral: 0.9 },
  ];
  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 36,
    tubularSegments: 72,
    tailEndU: 0.42,
    neckStartU: 0.8,
    tailSegmentCount: 6,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  // Sculpted Ceratopsian Skull + Parrot Rostral Beak + Articulated Mandible
  const { headGroup: headPivot, jawPivot } = buildSculptedSkull({
    length: 0.88,
    height: 0.38,
    width: 0.3,
    snoutTaper: 0.48,
    snoutDrop: -0.1,
    browRidge: 0.18,
    nasalBoss: 0.12,
    jugalFlare: 0.26,
    jawDepth: 0.38,
    toothCount: 0,
    hasBeak: true,
    beakHook: 0.09,
    skinMat,
    darkMat: frillMat,
    beakMat,
    palateMat: mouthMat,
  });
  headPivot.position.set(-0.04, -0.02, 0);
  spineBody.headMount.add(headPivot);

  // Solid parietal–squamosal frill: domed bone shield swept back over the neck
  const frillShield = buildFrillShield({
    height: 1.26,
    halfWidth: 0.78,
    thickness: 0.11,
    dome: 0.13,
    wrap: 0.16,
    material: frillMat,
  });
  const frillGroup = new THREE.Group();
  frillGroup.position.set(0.06, 0.08, 0);
  frillGroup.rotation.z = 0.54;
  frillGroup.add(frillShield.mesh);
  headPivot.add(frillGroup);

  // 13 epoccipital osteoderm studs or Styracosaurus long radiating frill spikes seated along the upper rim of the frill
  const hStyle = cfg.hornStyle || 'triceratops';
  for (let i = -6; i <= 6; i++) {
    const theta = (i / 6) * Math.PI * 0.6;
    const { position, dir } = frillShield.rimPoint(theta);
    const isLongSpike = hStyle === 'styracosaur' && Math.abs(i) >= 1 && Math.abs(i) <= 4;
    const isPachySpike = hStyle === 'pachyrhinosaur' && Math.abs(i) === 2;
    const spLen = isLongSpike ? 0.68 - Math.abs(i) * 0.08 : isPachySpike ? 0.42 : 0.13;
    const stud = buildLoftedOrganMesh(
      [V3(0, -0.02, 0), V3(0, spLen * 0.48, 0), V3(0, spLen, 0)],
      [
        { rx: isLongSpike ? 0.068 : 0.055, ry: 0.042 },
        { rx: isLongSpike ? 0.042 : 0.038, ry: 0.028 },
        { rx: 0.006, ry: 0.006 },
      ],
      hornMat,
      10,
      8,
      { unit: true, noVentral: true }
    );
    stud.userData.hardTissue = true;
    orientYToward(stud, dir, new THREE.Vector3(1, 0, 0));
    stud.position.copy(position);
    frillGroup.add(stud);
  }

  // Twin curved postorbital brow horns + epijugal cheek horns + nasal horn/boss
  [-1, 1].forEach((side) => {
    if (hStyle === 'triceratops') {
      const browHorn = buildLoftedOrganMesh(
        [
          V3(0.18, 0.24, side * 0.21),
          V3(0.62, 0.44, side * 0.25),
          V3(1.08, 0.5, side * 0.2),
        ],
        [{ rx: 0.085, ry: 0.085 }, { rx: 0.052, ry: 0.052 }, { rx: 0.008, ry: 0.008 }],
        hornMat,
        14,
        16,
        { unit: true, noVentral: true }
      );
      browHorn.userData.hardTissue = true;
      headPivot.add(browHorn);
    }

    const jugalHorn = buildLoftedOrganMesh(
      [V3(0.16, -0.04, side * 0.28), V3(0.12, -0.1, side * 0.4)],
      [{ rx: 0.045, ry: 0.045 }, { rx: 0.008, ry: 0.008 }],
      hornMat,
      10,
      8,
      { unit: true, noVentral: true }
    );
    jugalHorn.userData.hardTissue = true;
    headPivot.add(jugalHorn);
  });

  if (hStyle === 'pachyrhinosaur') {
    // Pachyrhinosaurus massive rugose nasal battering-ram boss cushion
    const boss = buildLoftedOrganMesh(
      [V3(0.42, 0.08, 0), V3(0.62, 0.22, 0), V3(0.78, 0.12, 0)],
      [
        { rx: 0.14, ry: 0.22, dorsalRidge: 0.35 },
        { rx: 0.18, ry: 0.26, dorsalRidge: 0.45 },
        { rx: 0.1, ry: 0.16, dorsalRidge: 0.25 },
      ],
      hornMat,
      18,
      12,
      { unit: true, noVentral: true }
    );
    boss.userData.hardTissue = true;
    headPivot.add(boss);
  } else if (hStyle !== 'protoceratops') {
    const nHeight = hStyle === 'styracosaur' ? 0.64 : 0.32;
    const nasalHorn = buildLoftedOrganMesh(
      [V3(0.64, 0.04, 0), V3(0.74, 0.04 + nHeight * 0.55, 0), V3(0.84, 0.04 + nHeight, 0)],
      [
        { rx: hStyle === 'styracosaur' ? 0.088 : 0.062, ry: 0.065 },
        { rx: hStyle === 'styracosaur' ? 0.055 : 0.038, ry: 0.042 },
        { rx: 0.008, ry: 0.008 },
      ],
      hornMat,
      12,
      12,
      { unit: true, noVentral: true }
    );
    nasalHorn.userData.hardTissue = true;
    headPivot.add(nasalHorn);
  }

  const eyes = attachEyes(headPivot, skinMat, {
    x: 0.24,
    y: 0.11,
    z: 0.27,
    radius: 0.04,
    preset: EYE_PRESETS.ornithischian,
    gazeForward: 0.24,
    gazeUp: 0.05,
  });
  attachNostrils(headPivot, { x: 0.66, y: -0.02, z: 0.11, r: 0.022 });

  // 4 Sculpted Muscular Quadruped Legs
  const legs = [];
  const legBoneGroups = [];
  [
    [0.52, -0.06, 0.38, 0, 0.88, 1],
    [0.52, -0.06, -0.38, Math.PI, 0.88, -1],
    [-0.46, 0.02, 0.4, Math.PI * 0.5, 1.0, 1],
    [-0.46, 0.02, -0.4, Math.PI * 1.5, 1.0, -1],
  ].forEach(([lx, ly, lz, phase, sc, side]) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.48 * sc,
      shinLen: 0.44 * sc,
      footLen: 0.26,
      thighR: 0.21,
      shinR: 0.15,
      toeCount: 4,
      clawLen: 0.075,
      clawR: 0.026,
      hoofed: true,
      digitigrade: false,
      skinMat,
      clawMat: nailMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(lx, ly, lz);
    bodyGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headPivot, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup: headPivot,
    jawPivot,
    gait: { walk: 2.2, sprint: 4.4 },
    locomotion: 'quad',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 4.4 : 2.2;
      const cyc = time * spd;
      bodyGroup.position.y = 0.08 + Math.abs(Math.sin(cyc)) * 0.065;
      bodyGroup.rotation.z = Math.sin(cyc) * 0.035;

      const neckPitch = Math.sin(time * (whatIf ? 4.5 : 2.0)) * 0.14;
      const neckYaw = Math.cos(time * 1.6) * 0.16;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: 0.2,
        tailSwayY: 0.04,
        neckPitch,
        neckYaw,
        breath: Math.sin(time * 2.6) * 0.028,
      });

      headPivot.rotation.z = neckPitch;
      headPivot.rotation.y = neckYaw;
      jawPivot.rotation.z = -Math.max(0, Math.sin(time * 1.9 - 0.4)) * 0.22;

      legs.forEach(({ hipGroup, kneeGroup, phase }) => {
        const s = Math.sin(cyc + phase);
        hipGroup.rotation.z = s * 0.32;
        kneeGroup.rotation.z = Math.max(0, -Math.cos(cyc + phase)) * 0.4;
      });

    },
  };
}

// -----------------------------------------------------------------------------
// 4. PARAMETRIC STEGOSAUR RIG (Stegosaurus & Kentrosaurus)
// -----------------------------------------------------------------------------
function buildParametricStegosaur(species, cfg, anatMats) {
  const root = new THREE.Group();
  const skinMat = makePBRMaterial(
    `stego_${species.id}`,
    cfg.primaryColor || '#4d7c0f',
    '#1a2e05',
    skinOptions(species, cfg, { roughness: 0.58, bumpScale: 0.13, cells: 20 })
  );
  const plateMat = makePBRMaterial(`stegoPlate_${species.id}`, cfg.accentColor || '#ea580c', '#7c2d12', {
    style: 'sail',
    roughness: 0.46,
    doubleSide: true,
    naturalize: 'accent',
    seed: (hashString(species.id) % 500) + 9,
  });
  const spikeMat = makeKeratinMaterial('horn', { gradientAxis: 'u' });
  const beakMat = makeKeratinMaterial('beak', { gradientAxis: 'u' });
  const nailMat = makeKeratinMaterial('hoof');
  const mouthMat = makeSoftTissueMaterial('#591622');

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.06;
  root.add(bodyGroup);

  // Continuous sculpted body: muscular tail → high-arched sacral pelvis → deep ribcage → low-slung neck
  const spineStations = [
    { pos: V3(-2.15, -0.02, 0), rx: 0.042, ry: 0.04, dorsalRidge: 0.14, ventral: 0.25 },
    { pos: V3(-1.52, 0.05, 0), rx: 0.16, ry: 0.14, dorsalRidge: 0.16, ventral: 0.5 },
    { pos: V3(-0.88, 0.14, 0), rx: 0.34, ry: 0.3, dorsalRidge: 0.2, ribBulge: 0.14, ventral: 0.8 },
    { pos: V3(-0.18, 0.28, 0), rx: 0.6, ry: 0.52, dorsalRidge: 0.24, ribBulge: 0.24, bellyFlat: 0.1, ventral: 1.0 },
    { pos: V3(0.45, 0.06, 0), rx: 0.44, ry: 0.38, dorsalRidge: 0.18, ribBulge: 0.18, bellyFlat: 0.12, ventral: 0.95 },
    { pos: V3(0.86, -0.08, 0), rx: 0.24, ry: 0.2, dorsalRidge: 0.14, ventral: 0.85 },
    { pos: V3(1.18, -0.12, 0), rx: 0.15, ry: 0.13, dorsalRidge: 0.1, ventral: 0.7 },
  ];
  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 36,
    tubularSegments: 76,
    tailEndU: 0.42,
    neckStartU: 0.76,
    tailSegmentCount: 6,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  const isKentro = cfg.plateStyle === 'spikes_and_shoulder';

  // Two alternating rows of pentagonal diamond-shaped vascularized bone plates (or Kentrosaurus posterior spikes)
  for (let i = 0; i < 13; i++) {
    const u = 0.2 + (i / 12) * 0.72;
    const pt = spineBody.curve.getPointAt(u);
    const archFactor = Math.sin(((u - 0.15) / 0.8) * Math.PI);
    const topY = pt.y + 0.14 + archFactor * 0.42;
    const side = i % 2 === 0 ? 1 : -1;

    if (isKentro && i < 6) {
      [-1, 1].forEach((sSign) => {
        const sp = buildLoftedOrganMesh(
          [V3(pt.x, topY - 0.05, sSign * 0.09), V3(pt.x - 0.18, topY + 0.34, sSign * 0.28), V3(pt.x - 0.32, topY + 0.58, sSign * 0.42)],
          [{ rx: 0.042, ry: 0.042 }, { rx: 0.025, ry: 0.025 }, { rx: 0.005, ry: 0.005 }],
          spikeMat,
          10,
          10,
          { unit: true, noVentral: true }
        );
        sp.userData.hardTissue = true;
        bodyGroup.add(sp);
      });
    } else {
      const pHeight = 0.18 + Math.pow(Math.max(0, archFactor), 0.85) * 0.52;
      const pWidth = pHeight * 0.78;
      const plate = buildStegoPlate(pHeight, pWidth, 0.04, plateMat);
      plate.position.set(pt.x, topY - 0.04, side * 0.075);
      plate.rotation.z = (0.5 - u) * 0.55;
      plate.rotation.x = side * 0.12;
      bodyGroup.add(plate);
    }
  }

  // Kentrosaurus Twin Parascapular Shoulder Javelin Spikes
  if (isKentro) {
    [-1, 1].forEach((side) => {
      const javelin = buildLoftedOrganMesh(
        [V3(0.28, 0.05, side * 0.34), V3(0.08, 0.12, side * 0.68), V3(-0.14, 0.18, side * 0.96)],
        [{ rx: 0.058, ry: 0.058 }, { rx: 0.034, ry: 0.034 }, { rx: 0.006, ry: 0.006 }],
        spikeMat,
        12,
        10,
        { unit: true, noVentral: true }
      );
      javelin.userData.hardTissue = true;
      bodyGroup.add(javelin);
    });
  }

  // 4 Curved Thagomizer Tail Spikes mounted on spineBody.tailTipMount
  [-1, 1].forEach((side) => {
    [0, 0.18].forEach((xOff, idx) => {
      const len = idx === 0 ? 0.48 : 0.42;
      const spike = buildLoftedOrganMesh(
        [
          V3(xOff, 0.03, side * 0.04),
          V3(xOff - len * 0.38, 0.14, side * len * 0.55),
          V3(xOff - len * 0.72, 0.22, side * len * 0.92),
        ],
        [{ rx: 0.042, ry: 0.042 }, { rx: 0.025, ry: 0.025 }, { rx: 0.005, ry: 0.005 }],
        spikeMat,
        10,
        10,
        { unit: true, noVentral: true }
      );
      spike.userData.hardTissue = true;
      spineBody.tailTipMount.add(spike);
    });
  });

  // Sculpted Low Narrow Stegosaur Skull + Keratin Beak + Articulated Jaw
  const { headGroup: headPivot, jawPivot } = buildSculptedSkull({
    length: 0.5,
    height: 0.19,
    width: 0.13,
    snoutTaper: 0.42,
    snoutDrop: -0.04,
    browRidge: 0.1,
    nasalBoss: 0.06,
    jugalFlare: 0.1,
    jawDepth: 0.34,
    toothCount: 0,
    hasBeak: true,
    beakHook: 0.03,
    skinMat,
    darkMat: plateMat,
    beakMat,
    palateMat: mouthMat,
  });
  headPivot.position.set(-0.04, -0.02, 0);
  spineBody.headMount.add(headPivot);

  const eyes = attachEyes(headPivot, skinMat, {
    x: 0.15,
    y: 0.07,
    z: 0.11,
    radius: 0.026,
    preset: EYE_PRESETS.ornithischian,
    gazeForward: 0.22,
  });
  attachNostrils(headPivot, { x: 0.4, y: 0.01, z: 0.045, r: 0.014 });

  // 4 Sculpted 2-Jointed Legs (short muscular forelimbs, tall columnar hindlimbs)
  const legs = [];
  const legBoneGroups = [];
  [
    [0.52, -0.1, 0.32, 0, 0.74, 1],
    [0.52, -0.1, -0.32, Math.PI, 0.74, -1],
    [-0.38, 0.06, 0.36, Math.PI * 0.5, 1.04, 1],
    [-0.38, 0.06, -0.36, Math.PI * 1.5, 1.04, -1],
  ].forEach(([lx, ly, lz, phase, sc, side]) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.48 * sc,
      shinLen: 0.45 * sc,
      footLen: 0.24,
      thighR: 0.2 * sc,
      shinR: 0.14,
      toeCount: 3,
      clawLen: 0.065,
      clawR: 0.024,
      hoofed: true,
      digitigrade: false,
      skinMat,
      clawMat: nailMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(lx, ly, lz);
    bodyGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headPivot, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup: headPivot,
    jawPivot,
    gait: { walk: 1.9, sprint: 3.6 },
    locomotion: 'quad',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 3.6 : 1.9;
      const cyc = time * spd;
      bodyGroup.position.y = 0.06 + Math.abs(Math.sin(cyc)) * 0.05;

      const neckPitch = Math.sin(time * 2.0) * 0.1;
      const neckYaw = Math.cos(time * 1.5) * 0.12;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: whatIf ? 0.38 : 0.22,
        tailSwayY: 0.03,
        neckPitch,
        neckYaw,
        breath: Math.sin(time * 2.5) * 0.025,
      });

      headPivot.rotation.z = neckPitch;
      headPivot.rotation.y = neckYaw;
      jawPivot.rotation.z = -Math.max(0, Math.sin(time * 1.8 - 0.3)) * 0.18;

      legs.forEach(({ hipGroup, kneeGroup, phase }) => {
        const s = Math.sin(cyc + phase);
        hipGroup.rotation.z = s * 0.28;
        kneeGroup.rotation.z = Math.max(0, -Math.cos(cyc + phase)) * 0.34;
      });
    },
  };
}

// -----------------------------------------------------------------------------
// 5. PARAMETRIC ANKYLOSAUR RIG (Ankylosaurus, Sauropelta, Scutosaurus)
// -----------------------------------------------------------------------------
function buildParametricAnkylosaur(species, cfg, anatMats) {
  const root = new THREE.Group();
  const armorMat = makePBRMaterial(
    `anky_${species.id}`,
    cfg.primaryColor || '#57534e',
    '#292524',
    skinOptions(species, cfg, { roughness: 0.6, bumpScale: 0.16, cells: 14 })
  );
  const scuteMat = makeKeratinMaterial('scute', { gradientAxis: 'u' });
  const spikeMat = makeKeratinMaterial('darkHorn', { gradientAxis: 'u' });
  const beakMat = makeKeratinMaterial('beak', { gradientAxis: 'u' });
  const nailMat = makeKeratinMaterial('hoof');
  const mouthMat = makeSoftTissueMaterial('#591622');

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.04;
  root.add(bodyGroup);

  // Continuous low-slung tank body lofted seamlessly into the ossified tail handle & cervical neck
  const spineStations = [
    { pos: V3(-2.15, -0.02, 0), rx: 0.08, ry: 0.09, dorsalRidge: 0.1, bellyFlat: 0.2, ventral: 0.3 },
    { pos: V3(-1.55, 0.0, 0), rx: 0.14, ry: 0.16, dorsalRidge: 0.12, bellyFlat: 0.25, ventral: 0.5 },
    { pos: V3(-0.98, 0.04, 0), rx: 0.26, ry: 0.36, dorsalRidge: 0.14, ribBulge: 0.2, bellyFlat: 0.3, ventral: 0.8 },
    { pos: V3(-0.35, 0.1, 0), rx: 0.44, ry: 0.72, dorsalRidge: 0.12, ribBulge: 0.32, bellyFlat: 0.38, ventral: 1.0 },
    { pos: V3(0.28, 0.1, 0), rx: 0.44, ry: 0.7, dorsalRidge: 0.12, ribBulge: 0.3, bellyFlat: 0.38, ventral: 1.0 },
    { pos: V3(0.78, 0.05, 0), rx: 0.28, ry: 0.42, dorsalRidge: 0.14, ribBulge: 0.18, bellyFlat: 0.3, ventral: 0.9 },
    { pos: V3(1.04, 0.02, 0), rx: 0.2, ry: 0.26, dorsalRidge: 0.1, bellyFlat: 0.25, ventral: 0.75 },
  ];
  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: armorMat,
    radialSegments: 38,
    tubularSegments: 76,
    tailEndU: 0.4,
    neckStartU: 0.82,
    tailSegmentCount: 6,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  // Transverse bands of flat keeled polygonal osteoderm armor scutes + projecting lateral marginal spikes
  for (let band = 0; band < 8; band++) {
    const u = band / 7;
    const bx = -0.82 + u * 1.6;
    const widthScale = Math.sin(u * Math.PI) * 0.38 + 0.65;
    [-0.54, -0.28, 0, 0.28, 0.54].forEach((rz) => {
      const zPos = rz * widthScale;
      const archY = 0.48 * Math.sqrt(Math.max(0.1, 1 - (rz / 0.68) ** 2)) + 0.04;
      const scute = buildLoftedOrganMesh(
        [V3(bx - 0.08, archY - 0.01, zPos), V3(bx, archY + 0.035, zPos), V3(bx + 0.08, archY - 0.01, zPos)],
        [
          { rx: 0.022, ry: 0.055, dorsalRidge: 0.45, bellyFlat: 0.5 },
          { rx: 0.048, ry: 0.085, dorsalRidge: 0.65, bellyFlat: 0.6 },
          { rx: 0.02, ry: 0.05, dorsalRidge: 0.4, bellyFlat: 0.5 },
        ],
        scuteMat,
        12,
        8,
        { unit: true, noVentral: true }
      );
      scute.rotation.x = rz * 0.85;
      bodyGroup.add(scute);
    });

    // Lateral triangular marginal armor spikes along the flank
    [-1, 1].forEach((side) => {
      const zEdge = side * 0.72 * widthScale;
      const spike = buildLoftedOrganMesh(
        [V3(bx + 0.04, 0.1, zEdge * 0.85), V3(bx - 0.04, 0.08, zEdge * 1.15), V3(bx - 0.14, 0.06, zEdge * 1.38)],
        [{ rx: 0.042, ry: 0.065, bellyFlat: 0.4 }, { rx: 0.026, ry: 0.042 }, { rx: 0.005, ry: 0.005 }],
        spikeMat,
        10,
        8,
        { unit: true, noVentral: true }
      );
      spike.userData.hardTissue = true;
      bodyGroup.add(spike);
    });
  }

  // Sauropelta 90cm Parascapular Shoulder Spear Spikes
  if (cfg.shoulderSpikes) {
    [-1, 1].forEach((side) => {
      const spear = buildLoftedOrganMesh(
        [V3(0.42, 0.14, side * 0.52), V3(0.18, 0.24, side * 0.92), V3(-0.08, 0.34, side * 1.28)],
        [{ rx: 0.075, ry: 0.075 }, { rx: 0.045, ry: 0.045 }, { rx: 0.008, ry: 0.008 }],
        spikeMat,
        12,
        10,
        { unit: true, noVentral: true }
      );
      spear.userData.hardTissue = true;
      bodyGroup.add(spear);
    });
  }

  // Sculpted 60kg Twin-Lobed Osteoderm Sledgehammer Tail Club on spineBody.tailTipMount (omitted for Nodosaurids / Pareiasaurs)
  if (!cfg.noTailClub) {
    [-1, 1].forEach((side) => {
      const majorLobe = buildLoftedOrganMesh(
        [V3(0.18, 0, side * 0.05), V3(0.0, 0.01, side * 0.16), V3(-0.22, 0, side * 0.12), V3(-0.34, 0, side * 0.03)],
        [
          { rx: 0.08, ry: 0.08, bellyFlat: 0.3 },
          { rx: 0.14, ry: 0.16, dorsalRidge: 0.25, bellyFlat: 0.35 },
          { rx: 0.12, ry: 0.14, dorsalRidge: 0.2, bellyFlat: 0.35 },
          { rx: 0.04, ry: 0.05 },
        ],
        scuteMat,
        18,
        14,
        { unit: true, noVentral: true }
      );
      majorLobe.userData.hardTissue = true;
      spineBody.tailTipMount.add(majorLobe);
    });
  }

  // Broad Triangular Armored Skull with 4 Pyramidal Squamosal & Quadratojugal Horns
  const { headGroup: headPivot, jawPivot } = buildSculptedSkull({
    length: 0.56,
    height: 0.26,
    width: 0.25,
    snoutTaper: 0.62,
    snoutDrop: -0.05,
    browRidge: 0.22,
    nasalBoss: 0.16,
    jugalFlare: 0.24,
    jawDepth: 0.36,
    toothCount: 0,
    hasBeak: true,
    beakHook: 0.05,
    skinMat: armorMat,
    darkMat: scuteMat,
    beakMat,
    palateMat: mouthMat,
  });
  headPivot.position.set(-0.04, -0.02, 0);
  spineBody.headMount.add(headPivot);

  [-1, 1].forEach((side) => {
    // Upper posterior squamosal pyramid horn
    const sqHorn = buildLoftedOrganMesh(
      [V3(0.08, 0.12, side * 0.18), V3(-0.06, 0.22, side * 0.32), V3(-0.18, 0.28, side * 0.42)],
      [{ rx: 0.055, ry: 0.055 }, { rx: 0.032, ry: 0.032 }, { rx: 0.006, ry: 0.006 }],
      spikeMat,
      8,
      8,
      { unit: true, noVentral: true }
    );
    sqHorn.userData.hardTissue = true;
    headPivot.add(sqHorn);

    // Lower cheek quadratojugal pyramid horn
    const qjHorn = buildLoftedOrganMesh(
      [V3(0.14, -0.04, side * 0.22), V3(0.04, -0.1, side * 0.36), V3(-0.06, -0.14, side * 0.46)],
      [{ rx: 0.048, ry: 0.048 }, { rx: 0.028, ry: 0.028 }, { rx: 0.006, ry: 0.006 }],
      spikeMat,
      8,
      8,
      { unit: true, noVentral: true }
    );
    qjHorn.userData.hardTissue = true;
    headPivot.add(qjHorn);
  });

  const eyes = attachEyes(headPivot, armorMat, {
    x: 0.2,
    y: 0.07,
    z: 0.22,
    radius: 0.03,
    preset: EYE_PRESETS.ornithischian,
    gazeForward: 0.22,
  });
  attachNostrils(headPivot, { x: 0.48, y: 0.0, z: 0.08, r: 0.018 });

  // 4 Heavy Muscular Quadruped Legs
  const legs = [];
  const legBoneGroups = [];
  [
    [0.52, -0.08, 0.48, 0, 0.82, 1],
    [0.52, -0.08, -0.48, Math.PI, 0.82, -1],
    [-0.48, -0.04, 0.5, Math.PI * 0.5, 0.92, 1],
    [-0.48, -0.04, -0.5, Math.PI * 1.5, 0.92, -1],
  ].forEach(([lx, ly, lz, phase, sc, side]) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.42 * sc,
      shinLen: 0.38 * sc,
      footLen: 0.24,
      thighR: 0.2,
      shinR: 0.15,
      toeCount: 4,
      clawLen: 0.07,
      clawR: 0.025,
      hoofed: true,
      digitigrade: false,
      skinMat: armorMat,
      clawMat: nailMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(lx, ly, lz);
    bodyGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headPivot, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup: headPivot,
    jawPivot,
    gait: { walk: 1.8, sprint: 3.8 },
    locomotion: 'quad',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 3.8 : 1.8;
      const cyc = time * spd;
      bodyGroup.position.y = 0.04 + Math.abs(Math.sin(cyc)) * 0.04;

      const neckYaw = Math.sin(time * 1.8) * 0.1;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: whatIf ? 0.44 : 0.24,
        tailSwayY: 0.02,
        neckPitch: Math.cos(time * 2.0) * 0.06,
        neckYaw,
        breath: Math.sin(time * 2.4) * 0.02,
      });

      headPivot.rotation.y = neckYaw;
      jawPivot.rotation.z = -Math.max(0, Math.sin(time * 1.8 - 0.2)) * 0.18;

      legs.forEach(({ hipGroup, kneeGroup, phase }) => {
        const s = Math.sin(cyc + phase);
        hipGroup.rotation.z = s * 0.26;
        kneeGroup.rotation.z = Math.max(0, -Math.cos(cyc + phase)) * 0.32;
      });
    },
  };
}

// -----------------------------------------------------------------------------
// 6. PARAMETRIC HADROSAUR / ORNITHOPOD RIG (Parasaurolophus, Iguanodon, Corythosaurus, Edmontosaurus, Maiasaura, Psittacosaurus)
// -----------------------------------------------------------------------------
function buildParametricHadrosaur(species, cfg, anatMats) {
  const root = new THREE.Group();
  const skinMat = makePBRMaterial(
    `hadro_${species.id}`,
    cfg.primaryColor || '#4d7c0f',
    '#1c1917',
    skinOptions(species, cfg, { roughness: 0.55, bumpScale: 0.12 })
  );
  const accentMat = makePBRMaterial(`hadroAcc_${species.id}`, cfg.accentColor || '#f97316', '#7c2d12', {
    style: 'scales',
    roughness: 0.44,
    naturalize: 'accent',
    pattern: 'mottle',
    cells: 14,
    seed: (hashString(species.id) % 500) + 13,
  });
  const spikeMat = makeKeratinMaterial('horn', { gradientAxis: 'u' });
  const billMat = makeKeratinMaterial('beak', { gradientAxis: 'u' });
  const hoofMat = makeKeratinMaterial('hoof');
  const mouthMat = makeSoftTissueMaterial('#591622');

  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = 0.32;
  root.add(pelvisGroup);

  // Unified continuous sculpted body: deep laterally-compressed paddle tail → high sacral pelvis → deep ribcage → graceful S-neck
  const spineStations = [
    { pos: V3(-2.65, 0.06, 0), rx: 0.055, ry: 0.025, dorsalRidge: 0.28, ventral: 0.3 },
    { pos: V3(-1.95, 0.08, 0), rx: 0.18, ry: 0.085, dorsalRidge: 0.32, ventral: 0.5 },
    { pos: V3(-1.22, 0.1, 0), rx: 0.32, ry: 0.18, dorsalRidge: 0.28, ribBulge: 0.1, ventral: 0.75 },
    { pos: V3(-0.48, 0.16, 0), rx: 0.48, ry: 0.38, dorsalRidge: 0.22, ribBulge: 0.2, bellyFlat: 0.08, ventral: 0.95 },
    { pos: V3(0.18, 0.22, 0), rx: 0.54, ry: 0.44, dorsalRidge: 0.18, ribBulge: 0.24, bellyFlat: 0.1, keel: 0.08, ventral: 1.0 },
    { pos: V3(0.68, 0.28, 0), rx: 0.38, ry: 0.32, dorsalRidge: 0.15, ribBulge: 0.14, ventral: 0.9 },
    { pos: V3(0.96, 0.52, 0), rx: 0.25, ry: 0.21, dorsalRidge: 0.14, ventral: 0.8 },
    { pos: V3(1.18, 0.78, 0), rx: 0.19, ry: 0.16, dorsalRidge: 0.12, ventral: 0.65 },
  ];
  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 38,
    tubularSegments: 80,
    tailEndU: 0.44,
    neckStartU: 0.72,
    tailSegmentCount: 7,
  });
  pelvisGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => pelvisGroup.add(s));

  // Frilled neural-spine ridge along the back and tail (or Psittacosaurus hollow tail bristles)
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const scute = buildStegoPlate(0.055 + 0.035 * Math.sin(u * Math.PI), 0.08, 0.02, accentMat);
    scute.position.set(-1.35 + u * 2.0, 0.42 + 0.2 * Math.sin(u * Math.PI), 0);
    scute.rotation.z = -0.15;
    pelvisGroup.add(scute);
  }
  if (cfg.tailBristles) {
    // Psittacosaurus row of 24 tall hollow keratinous quill bristles along the dorsal tail
    for (let q = 0; q < 24; q++) {
      const u = 0.06 + (q / 23) * 0.34;
      const pt = spineBody.curve.getPointAt(u);
      const qLen = 0.28 + 0.22 * Math.sin((q / 23) * Math.PI);
      const quill = buildLoftedOrganMesh(
        [V3(pt.x, pt.y + 0.08, 0), V3(pt.x - 0.12, pt.y + 0.08 + qLen, (q % 2 === 0 ? 1 : -1) * 0.02)],
        [{ rx: 0.012, ry: 0.012 }, { rx: 0.003, ry: 0.003 }],
        spikeMat,
        6,
        6,
        { unit: true, noVentral: true }
      );
      pelvisGroup.add(quill);
    }
  }

  // Sculpted Hadrosaur Skull + Expanded Spatulate Duck-Bill + Articulated Jaw
  const { headGroup, jawPivot } = buildSculptedSkull({
    length: 0.64,
    height: 0.25,
    width: 0.17,
    snoutTaper: 0.78,
    snoutDrop: -0.06,
    browRidge: 0.12,
    nasalBoss: 0.08,
    jugalFlare: 0.18,
    jawDepth: 0.36,
    toothCount: 0,
    hasBeak: true,
    beakHook: cfg.tailBristles ? 0.08 : 0.01,
    skinMat,
    darkMat: accentMat,
    beakMat: billMat,
    palateMat: mouthMat,
  });
  headGroup.position.set(-0.04, -0.04, 0);
  spineBody.headMount.add(headGroup);

  // Species-specific Hadrosaur Crests: Parasaurolophus Trombone Tube, Corythosaurus Corinthian Helmet, Edmontosaurus Fleshy Comb, Maiasaura Brow Wedge
  if (cfg.hasCrest) {
    if (cfg.crestType === 'trombone_tube') {
      const crestPts = [
        V3(0.32, 0.08, 0),
        V3(0.08, 0.24, 0),
        V3(-0.28, 0.42, 0),
        V3(-0.68, 0.52, 0),
        V3(-0.76, 0.48, 0),
      ];
      const crestR = [
        { rx: 0.085, ry: 0.095, dorsalRidge: 0.15, ventral: 0 },
        { rx: 0.09, ry: 0.095, dorsalRidge: 0.18, ventral: 0 },
        { rx: 0.075, ry: 0.08, dorsalRidge: 0.15, ventral: 0 },
        { rx: 0.052, ry: 0.058, ventral: 0 },
        { rx: 0.022, ry: 0.025, ventral: 0 },
      ];
      const crest = buildLoftedOrganMesh(crestPts, crestR, accentMat, 24, 28, { noVentral: true });
      headGroup.add(crest);
    } else if (cfg.crestType === 'helmet_dome') {
      const helmet = buildStegoPlate(0.34, 0.46, 0.055, accentMat);
      helmet.position.set(0.16, 0.12, 0);
      headGroup.add(helmet);
    } else if (cfg.crestType === 'fleshy_comb') {
      const comb = buildStegoPlate(0.18, 0.24, 0.06, accentMat);
      comb.position.set(0.12, 0.12, 0);
      headGroup.add(comb);
    } else if (cfg.crestType === 'brow_horns') {
      const wedge = buildStegoPlate(0.11, 0.16, 0.08, accentMat);
      wedge.position.set(0.18, 0.12, 0);
      headGroup.add(wedge);
    }
  }

  const eyes = attachEyes(headGroup, skinMat, {
    x: 0.15,
    y: 0.09,
    z: 0.15,
    radius: 0.034,
    preset: EYE_PRESETS.ornithischian,
    gazeForward: 0.24,
    gazeUp: 0.05,
  });
  attachNostrils(headGroup, { x: 0.46, y: 0.02, z: 0.085, r: 0.018 });

  // 2 Sculpted 2-Jointed Forelimbs (+ Optional Iguanodon Conical Thumb Spikes)
  const forelimbs = [];
  const legBoneGroups = [];
  [-1, 1].forEach((side) => {
    const arm = buildArticulatedLimb({
      side,
      thighLen: 0.32,
      shinLen: 0.3,
      footLen: 0.18,
      thighR: 0.1,
      shinR: 0.072,
      toeCount: 3,
      clawLen: 0.055,
      clawR: 0.02,
      thumbSpike: Boolean(cfg.hasThumbSpike),
      hoofed: true,
      digitigrade: false,
      skinMat,
      clawMat: cfg.hasThumbSpike ? spikeMat : hoofMat,
      legBoneGroups,
    });
    arm.hipGroup.position.set(0.62, 0.08, side * 0.3);
    arm.hipGroup.rotation.z = 0.36;
    arm.kneeGroup.rotation.z = 0.42;
    pelvisGroup.add(arm.hipGroup);
    forelimbs.push(arm.hipGroup);
  });

  // 2 Full 3-Joint Digitigrade Hind Legs with 3 Broad Hoofed Toes (replacing the single blue capsule!)
  const legs = [];
  [-1, 1].forEach((side, idx) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.68,
      shinLen: 0.64,
      footLen: 0.34,
      thighR: 0.26,
      shinR: 0.145,
      toeCount: 3,
      clawLen: 0.085,
      clawR: 0.032,
      hoofed: true,
      digitigrade: true,
      skinMat,
      clawMat: hoofMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(-0.24, 0.04, side * 0.32);
    pelvisGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase: idx * Math.PI });
  });

  const anat = attachInternalAnatomyAndSkeleton(pelvisGroup, headGroup, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup,
    jawPivot,
    gait: { walk: 2.1, sprint: 3.8 },
    locomotion: 'biped',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 3.8 : 2.1;
      const cyc = time * spd;
      pelvisGroup.position.y = 0.32 + Math.abs(Math.sin(cyc)) * 0.085;
      pelvisGroup.rotation.z = Math.sin(cyc) * 0.045 + (whatIf ? 0.18 : 0);

      const neckPitch = Math.sin(time * 2.0) * 0.11 + (whatIf ? 0.14 : 0);
      const neckYaw = Math.cos(time * 1.5) * 0.12;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: 0.24,
        tailSwayY: 0.04,
        neckPitch,
        neckYaw,
        breath: Math.sin(time * 2.7) * 0.028,
      });

      headGroup.rotation.z = Math.cos(time * 2.4) * 0.1;
      headGroup.rotation.y = neckYaw * 0.8;
      jawPivot.rotation.z = -Math.max(0, Math.sin(time * 2.0 - 0.3)) * 0.22;

      forelimbs.forEach((arm, idx) => {
        arm.rotation.z = 0.36 + Math.sin(cyc + idx * Math.PI) * (whatIf ? 0.38 : 0.2);
      });

      legs.forEach(({ hipGroup, kneeGroup, footGroup, phase }) => {
        const s = Math.sin(cyc + phase);
        const c = Math.cos(cyc + phase);
        hipGroup.rotation.z = s * 0.36;
        kneeGroup.rotation.z = -Math.max(0, c) * 0.45 - 0.08;
        footGroup.rotation.z = -hipGroup.rotation.z * 0.65;
      });
    },
  };
}

// -----------------------------------------------------------------------------
// 7. PARAMETRIC SYNAPSID RIG (Dimetrodon with Solar Sail & Inostrancevia Saber-Tooth)
// -----------------------------------------------------------------------------
function buildParametricSynapsid(species, cfg, anatMats) {
  const root = new THREE.Group();
  const skinMat = makePBRMaterial(
    `syn_${species.id}`,
    cfg.primaryColor || '#b45309',
    '#451a03',
    skinOptions(species, cfg, { roughness: 0.55, bumpScale: 0.12, cells: 22 })
  );
  const sailMat = makePBRMaterial(`synSail_${species.id}`, cfg.secondaryColor || '#fde047', cfg.accentColor || '#dc2626', {
    style: 'sail',
    roughness: 0.42,
    doubleSide: true,
    naturalize: 'accent',
    seed: (hashString(species.id) % 500) + 17,
  });
  const fangMat = makeKeratinMaterial('fang', { gradientAxis: 'u' });
  const spineMat = makeKeratinMaterial('horn', { gradientAxis: 'u' });
  const clawMat = makeKeratinMaterial('claw');
  const mouthMat = makeSoftTissueMaterial('#591622');

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = -0.04;
  root.add(bodyGroup);

  // Continuous low-slung reptile-mammal body: tapering tail → pelvis → deep thoracic ribcage → thick muscular neck
  const spineStations = [
    { pos: V3(-2.18, -0.14, 0), rx: 0.026, ry: 0.026, dorsalRidge: 0.14, ventral: 0.2 },
    { pos: V3(-1.55, -0.1, 0), rx: 0.11, ry: 0.1, dorsalRidge: 0.16, ventral: 0.45 },
    { pos: V3(-0.92, -0.04, 0), rx: 0.25, ry: 0.22, dorsalRidge: 0.18, ribBulge: 0.12, ventral: 0.75 },
    { pos: V3(-0.28, 0.06, 0), rx: 0.42, ry: 0.38, dorsalRidge: 0.2, ribBulge: 0.22, bellyFlat: 0.12, ventral: 1.0 },
    { pos: V3(0.38, 0.08, 0), rx: 0.44, ry: 0.39, dorsalRidge: 0.2, ribBulge: 0.24, bellyFlat: 0.12, keel: 0.08, ventral: 1.0 },
    { pos: V3(0.84, 0.08, 0), rx: 0.31, ry: 0.27, dorsalRidge: 0.16, ribBulge: 0.14, ventral: 0.85 },
  ];
  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 36,
    tubularSegments: 74,
    tailEndU: 0.42,
    neckStartU: 0.8,
    tailSegmentCount: 6,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  // Dimetrodon Tall Neural-Spine Solar Sail (continuous vascular membrane + lofted bony neural spines)
  if (cfg.hasSail) {
    const sailH = cfg.sailHeight || 1.08;
    const profile = (u) => Math.pow(Math.sin(Math.pow(u, 0.9) * Math.PI), 0.72) * 0.96 * sailH + 0.04;
    const sail = buildSailMembrane({
      x0: -0.78,
      x1: 0.74,
      baseYAt: () => 0.32,
      heightAt: profile,
      material: sailMat,
      segments: 38,
      rows: 10,
    });
    bodyGroup.add(sail);
    for (let i = -7; i <= 7; i++) {
      const u = (i + 7) / 14;
      const spineH = profile(u) * 0.98;
      const rod = buildLoftedOrganMesh(
        [V3(-0.78 + u * 1.52, 0.28, 0), V3(-0.78 + u * 1.52, 0.32 + spineH, 0)],
        [{ rx: 0.022, ry: 0.02 }, { rx: 0.007, ry: 0.007 }],
        spineMat,
        10,
        8,
        { unit: true, noVentral: true }
      );
      bodyGroup.add(rod);
      if (cfg.sailCrossbars && spineH > 0.25) {
        [0.42, 0.72].forEach((frac) => {
          const bar = buildLoftedOrganMesh(
            [V3(-0.78 + u * 1.52, 0.32 + spineH * frac, -0.075), V3(-0.78 + u * 1.52, 0.32 + spineH * frac, 0.075)],
            [{ rx: 0.008, ry: 0.008 }, { rx: 0.008, ry: 0.008 }],
            spineMat,
            6,
            6,
            { unit: true, noVentral: true }
          );
          bodyGroup.add(bar);
        });
      }
    }
  }

  // Deep Sphenacodont / Gorgonopsid Skull + Overhanging Maxillary Saber Canines
  const skScale = cfg.skullScale || 1.08;
  const { headGroup: headPivot, jawPivot } = buildSculptedSkull({
    length: 0.74 * skScale,
    height: 0.34 * skScale,
    width: 0.22 * skScale,
    snoutTaper: 0.56,
    snoutDrop: -0.03,
    browRidge: 0.18,
    nasalBoss: 0.12,
    premaxNotch: 0.35,
    jugalFlare: 0.2,
    jawDepth: 0.42,
    toothCount: 7,
    toothLength: 0.055 * skScale,
    toothRadius: 0.012 * skScale,
    toothCurl: 0.2,
    skinMat,
    darkMat: skinMat,
    toothMat: fangMat,
    palateMat: mouthMat,
  });
  headPivot.position.set(-0.04, -0.02, 0);
  spineBody.headMount.add(headPivot);

  // Prominent protruding upper saber canines
  [-1, 1].forEach((side) => {
    const saber = buildCurvedTooth(0.22 * skScale, 0.026 * skScale, fangMat, 0.22);
    saber.position.set(0.46 * skScale, -0.04 * skScale, side * 0.12 * skScale);
    saber.rotation.x = side * 0.08;
    headPivot.add(saber);
  });

  const eyes = attachEyes(headPivot, skinMat, {
    x: 0.18 * skScale,
    y: 0.12 * skScale,
    z: 0.18 * skScale,
    radius: 0.038 * skScale,
    preset: EYE_PRESETS.synapsid,
    gazeForward: 0.34,
    gazeUp: 0.06,
  });
  attachNostrils(headPivot, { x: 0.62 * skScale, y: 0.04 * skScale, z: 0.065 * skScale, r: 0.018 * skScale });

  // 4 Sprawling 2-Jointed Muscular Limbs with 5-Clawed Plantigrade Feet
  const legs = [];
  const legBoneGroups = [];
  [
    [0.48, -0.04, 0.32, 0, 1],
    [0.48, -0.04, -0.32, Math.PI, -1],
    [-0.46, -0.04, 0.32, Math.PI * 0.5, 1],
    [-0.46, -0.04, -0.32, Math.PI * 1.5, -1],
  ].forEach(([lx, ly, lz, phase, side]) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.36,
      shinLen: 0.34,
      footLen: 0.24,
      thighR: 0.16,
      shinR: 0.11,
      toeCount: 4,
      clawLen: 0.075,
      clawR: 0.02,
      sprawling: 0.42,
      digitigrade: false,
      skinMat,
      clawMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(lx, ly, lz);
    bodyGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headPivot, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup: headPivot,
    jawPivot,
    gait: { walk: 2.1, sprint: 4.0 },
    locomotion: 'quad',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 4.0 : 2.1;
      const cyc = time * spd;
      bodyGroup.position.y = -0.04 + Math.abs(Math.sin(cyc)) * 0.045;
      bodyGroup.rotation.y = Math.sin(cyc) * 0.045;

      const neckYaw = Math.sin(time * 1.6) * 0.12;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: 0.24,
        tailSwayY: 0.03,
        neckPitch: Math.sin(time * 2.2) * 0.08,
        neckYaw,
        breath: Math.sin(time * 2.8) * 0.025,
      });

      headPivot.rotation.z = Math.sin(time * 2.2) * 0.1;
      headPivot.rotation.y = neckYaw * 0.8;
      jawPivot.rotation.z = -(whatIf ? 0.5 + Math.abs(Math.sin(time * 6)) * 0.3 : Math.max(0, Math.sin(time * 2.0)) * 0.32);

      legs.forEach(({ hipGroup, kneeGroup, phase }) => {
        const s = Math.sin(cyc + phase);
        hipGroup.rotation.z = s * 0.32;
        kneeGroup.rotation.z = Math.max(0, -Math.cos(cyc + phase)) * 0.35;
      });
    },
  };
}

// -----------------------------------------------------------------------------
// 8. PARAMETRIC PTEROSAUR & AVIAN RIGS (Quetzalcoatlus, Archaeopteryx, K-Pg Birds)
// -----------------------------------------------------------------------------
function buildParametricPterosaur(species, cfg, anatMats) {
  const root = new THREE.Group();
  // Dense pycnofiber pelage on torso and neck
  const skinMat = makePBRMaterial(
    `ptero_${species.id}`,
    cfg.primaryColor || '#b45309',
    '#451a03',
    skinOptions(species, cfg, {
      style: 'feathers',
      roughness: 0.72,
      bumpScale: 0.06,
      cells: 26,
      pattern: 'mottle',
      sheen: 0.38,
    })
  );
  const wingMat = makePBRMaterial(`pteroWing_${species.id}`, cfg.accentColor || '#dc2626', '#450a0a', {
    style: 'sail',
    roughness: 0.46,
    doubleSide: true,
    naturalize: 'accent',
    bumpScale: 0.06,
    seed: (hashString(species.id) % 500) + 23,
  });
  const beakMat = makeKeratinMaterial('beak', { gradientAxis: 'u' });
  const crestMat = makePBRMaterial(`pteroCrest_${species.id}`, cfg.accentColor || '#dc2626', '#fde68a', {
    style: 'sail',
    roughness: 0.42,
    doubleSide: true,
    naturalize: 'accent',
  });
  const clawMat = makeKeratinMaterial('claw');
  const toothMat = makeKeratinMaterial('tooth', { gradientAxis: 'u' });
  const mouthMat = makeSoftTissueMaterial('#591622');

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.22;
  root.add(bodyGroup);

  // Continuous sculpted pterosaur body: long rhamphorhynchoid tail OR vestigial azhdarchid tail → compact tear-drop thorax → neck
  const isLongTail = !!cfg.longTailVane;
  const spineStations = isLongTail
    ? [
        { pos: V3(-1.58, -0.08, 0), rx: 0.016, ry: 0.016, dorsalRidge: 0.06, ventral: 0.15 },
        { pos: V3(-1.05, -0.05, 0), rx: 0.028, ry: 0.028, dorsalRidge: 0.08, ventral: 0.25 },
        { pos: V3(-0.48, -0.02, 0), rx: 0.12, ry: 0.11, dorsalRidge: 0.12, ribBulge: 0.1, ventral: 0.65 },
        { pos: V3(-0.08, 0.04, 0), rx: 0.24, ry: 0.23, dorsalRidge: 0.14, ribBulge: 0.2, keel: 0.18, ventral: 1.0 },
        { pos: V3(0.24, 0.08, 0), rx: 0.22, ry: 0.2, dorsalRidge: 0.12, ribBulge: 0.18, keel: 0.2, ventral: 1.0 },
        { pos: V3(0.48, 0.16, 0), rx: 0.14, ry: 0.13, dorsalRidge: 0.08, ventral: 0.85 },
      ]
    : [
        { pos: V3(-0.62, -0.06, 0), rx: 0.025, ry: 0.025, dorsalRidge: 0.08, ventral: 0.2 },
        { pos: V3(-0.42, -0.02, 0), rx: 0.14, ry: 0.13, dorsalRidge: 0.12, ribBulge: 0.1, ventral: 0.65 },
        { pos: V3(-0.08, 0.04, 0), rx: 0.25, ry: 0.24, dorsalRidge: 0.14, ribBulge: 0.2, keel: 0.18, ventral: 1.0 },
        { pos: V3(0.24, 0.08, 0), rx: 0.24, ry: 0.22, dorsalRidge: 0.12, ribBulge: 0.18, keel: 0.2, ventral: 1.0 },
        { pos: V3(0.48, 0.18, 0), rx: 0.13, ry: 0.12, dorsalRidge: 0.08, keel: 0.08, ventral: 0.85 },
        { pos: V3(0.76, 0.34, 0), rx: 0.1, ry: 0.095, dorsalRidge: 0.06, ventral: 0.85 },
        { pos: V3(1.02, 0.48, 0), rx: 0.095, ry: 0.09, dorsalRidge: 0.06, ventral: 0.85 },
      ];
  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 32,
    tubularSegments: 64,
    tailEndU: isLongTail ? 0.46 : 0.2,
    neckStartU: isLongTail ? 0.78 : 0.52,
    tailSegmentCount: isLongTail ? 4 : 2,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  if (isLongTail) {
    const tailVane = buildFinMesh({
      length: 0.28,
      widthAt: (t) => 0.18 * Math.sin(t * Math.PI),
      thickAt: (t) => 0.018 * (1 - 0.5 * t),
      sweep: 0.04,
      material: crestMat,
    });
    tailVane.rotation.x = -Math.PI / 2;
    tailVane.position.set(0.06, 0, 0);
    spineBody.tailTipMount.add(tailVane);
  }

  // Pterosaur Skull + Rostrum + Cranial Crest
  const { headGroup, jawPivot } = buildSculptedSkull({
    length: isLongTail ? 0.68 : 1.18,
    height: 0.22,
    width: 0.13,
    snoutTaper: isLongTail ? 0.32 : 0.18,
    snoutDrop: -0.02,
    browRidge: 0.12,
    nasalBoss: 0.06,
    premaxNotch: 0.0,
    jugalFlare: 0.12,
    jawDepth: 0.32,
    hasBeak: true,
    toothCount: isLongTail ? 6 : 0,
    toothLength: 0.042,
    toothRadius: 0.007,
    toothCurl: 0.25,
    skinMat,
    darkMat: skinMat,
    beakMat,
    toothMat,
    palateMat: mouthMat,
  });
  headGroup.position.set(-0.04, -0.02, 0);
  spineBody.headMount.add(headGroup);

  // Sculpted dorsal sagittal cranial crest (Hammer crest for Pteranodon, Tall Sail for Tapejara, Sagittal for Azhdarchids)
  if (!isLongTail) {
    const isHammer = !!cfg.hammerCrest;
    const isSail = !!cfg.giantSailCrest;
    const crest = buildFinMesh({
      length: isSail ? 0.68 : isHammer ? 0.62 : 0.44,
      widthAt: (t) => (isSail ? 0.42 : isHammer ? 0.2 : 0.24) * Math.sin(Math.pow(t, 0.75) * Math.PI),
      thickAt: (t) => 0.032 * (1 - 0.75 * t),
      sweep: isHammer ? 0.48 : isSail ? -0.05 : -0.18,
      material: crestMat,
    });
    crest.rotation.x = -Math.PI / 2;
    crest.position.set(isHammer ? -0.12 : isSail ? 0.32 : 0.24, 0.09, 0);
    headGroup.add(crest);
  }

  const eyes = attachEyes(headGroup, skinMat, {
    x: 0.16,
    y: 0.04,
    z: 0.095,
    radius: 0.028,
    preset: EYE_PRESETS.pterosaur,
    gazeForward: 0.3,
    gazeUp: 0.04,
  });
  attachNostrils(headGroup, { x: 0.42, y: 0.03, z: 0.028, r: 0.01 });

  // 2-Jointed 11-Meter Folding Wing Membranes with sculpted muscular wing spars & 3 winged-claw digits
  const wings = [];
  const legBoneGroups = [];
  const wScale = cfg.wingspanScale || 1.3;
  [-1, 1].forEach((side) => {
    const innerPivot = new THREE.Group();
    innerPivot.position.set(0.16, 0.08, side * 0.18);
    const innerSpan = 0.86 * wScale;
    const innerWing = buildMembranePanel({
      span: innerSpan,
      chordRoot: 0.64,
      chordTip: 0.46,
      side,
      material: wingMat,
      sag: 0.045,
    });
    innerPivot.add(innerWing);

    const humerusSpar = buildLoftedOrganMesh(
      [V3(0.02, 0.01, 0), V3(0.01, 0.0, side * innerSpan * 0.5), V3(0.0, 0.0, side * innerSpan)],
      [
        { rx: 0.065, ry: 0.055, dorsalRidge: 0.12 },
        { rx: 0.045, ry: 0.04 },
        { rx: 0.035, ry: 0.032 },
      ],
      skinMat,
      14,
      16,
      { unit: true }
    );
    innerPivot.add(humerusSpar);
    legBoneGroups.push({ group: innerPivot, length: 0.75 * wScale, radius: 0.032, yOffset: 0 });

    // Wing wrist digits I-III at the pteroid carpal joint
    for (let d = 0; d < 3; d++) {
      const wClaw = buildCurvedTooth(0.055, 0.012, clawMat, 0.32);
      wClaw.rotation.z = -Math.PI / 2.2;
      wClaw.position.set(0.05, -0.01 + (d - 1) * 0.018, side * (innerSpan - 0.02));
      innerPivot.add(wClaw);
    }

    const outerPivot = new THREE.Group();
    outerPivot.position.set(0, 0, side * innerSpan);
    const outerSpan = 1.18 * wScale;
    const outerWing = buildMembranePanel({
      span: outerSpan,
      chordRoot: 0.46,
      chordTip: 0.045,
      side,
      material: wingMat,
      sag: 0.03,
      tipRound: 0.62,
    });
    outerPivot.add(outerWing);

    const wingFingerSpar = buildLoftedOrganMesh(
      [V3(0.0, 0.0, 0), V3(0.0, 0.0, side * outerSpan * 0.55), V3(-0.04, 0.0, side * outerSpan)],
      [{ rx: 0.032, ry: 0.03 }, { rx: 0.02, ry: 0.018 }, { rx: 0.008, ry: 0.008 }],
      skinMat,
      12,
      16,
      { unit: true }
    );
    outerPivot.add(wingFingerSpar);

    innerPivot.add(outerPivot);
    bodyGroup.add(innerPivot);
    wings.push({ innerPivot, outerPivot, side });
  });

  // Trailing Slender Articulated Hind Legs
  const hindLegs = [];
  [-1, 1].forEach((side, idx) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.28,
      shinLen: 0.32,
      footLen: 0.16,
      thighR: 0.065,
      shinR: 0.042,
      toeCount: 4,
      clawLen: 0.04,
      clawR: 0.01,
      digitigrade: true,
      skinMat,
      clawMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(-0.28, -0.06, side * 0.14);
    limb.hipGroup.rotation.z = -1.15; // swept back in flight
    bodyGroup.add(limb.hipGroup);
    hindLegs.push({ ...limb, phase: idx * Math.PI });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headGroup, spineBody.tailSegments, legBoneGroups, anatMats, { ribRadius: 0.22 });

  return {
    group: root,
    headGroup,
    jawPivot,
    gait: { walk: 2.8, sprint: 5.2 },
    locomotion: 'fly',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 5.2 : 2.8;
      const flap = Math.sin(time * spd);
      bodyGroup.position.y = 0.22 + Math.cos(time * spd) * 0.14;

      const neckYaw = Math.sin(time * 1.4) * 0.08;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: 0.06,
        tailSwayY: 0.02,
        neckPitch: Math.sin(time * 1.8) * 0.08,
        neckYaw,
        breath: Math.sin(time * 3.0) * 0.022,
      });

      headGroup.rotation.z = Math.cos(time * 1.8) * 0.06;
      headGroup.rotation.y = neckYaw * 0.7;
      jawPivot.rotation.z = -(whatIf ? 0.26 + Math.abs(Math.sin(time * 5.2)) * 0.18 : Math.max(0, Math.sin(time * 2.1)) * 0.14);

      wings.forEach(({ innerPivot, outerPivot, side }) => {
        innerPivot.rotation.x = side * flap * 0.48;
        outerPivot.rotation.x = side * Math.sin(time * spd - 0.65) * 0.42;
      });
      hindLegs.forEach(({ hipGroup, phase }) => {
        hipGroup.rotation.z = -1.15 + Math.sin(time * spd + phase) * 0.08;
      });
    },
  };
}

function buildParametricAvian(species, cfg, anatMats) {
  const root = new THREE.Group();
  const plumageMat = makePBRMaterial(
    `avian_${species.id}`,
    cfg.primaryColor || '#1e293b',
    cfg.featherColor || '#475569',
    skinOptions(species, cfg, {
      style: 'feathers',
      roughness: 0.58,
      doubleSide: true,
      cells: 18,
      pattern: 'mottle',
      sheen: 0.48,
    })
  );
  const wingPlumeMat = makeFeatherCardMaterial(`avianWing_${species.id}`, cfg.featherColor || '#0284c7', cfg.accentColor || '#f59e0b');
  const covertMat = makeFeatherCardMaterial(`avianCovert_${species.id}`, cfg.primaryColor || '#1e293b', cfg.featherColor || '#38bdf8');
  const beakMat = makeKeratinMaterial(cfg.isModernAvian ? 'brightBeak' : 'beak', { gradientAxis: 'u' });
  const legMat = makePBRMaterial('avianLegScales', '#7a6540', '#3b2f1f', { style: 'scales', cells: 30, pattern: 'plain', roughness: 0.58 });
  const clawMat = makeKeratinMaterial('claw');
  const toothMat = makeKeratinMaterial('tooth', { gradientAxis: 'u' });
  const mouthMat = makeSoftTissueMaterial('#591622');

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.2;
  root.add(bodyGroup);

  // Continuous sculpted bird/urvogel body: bony tail (or short pygostyle) → keeled sternum thorax → S-curved neck
  const spineStations = cfg.isModernAvian
    ? [
        { pos: V3(-0.56, 0.02, 0), rx: 0.04, ry: 0.045, dorsalRidge: 0.08, ventral: 0.35 },
        { pos: V3(-0.34, 0.0, 0), rx: 0.16, ry: 0.18, dorsalRidge: 0.08, ribBulge: 0.14, ventral: 0.8 },
        { pos: V3(-0.04, 0.02, 0), rx: 0.26, ry: 0.25, dorsalRidge: 0.1, ribBulge: 0.2, keel: 0.22, ventral: 1.0 },
        { pos: V3(0.24, 0.1, 0), rx: 0.22, ry: 0.21, dorsalRidge: 0.08, ribBulge: 0.14, keel: 0.16, ventral: 0.95 },
        { pos: V3(0.42, 0.28, 0), rx: 0.12, ry: 0.11, dorsalRidge: 0.06, ventral: 0.85 },
      ]
    : [
        { pos: V3(-1.38, -0.14, 0), rx: 0.02, ry: 0.02, dorsalRidge: 0.1, ventral: 0.2 },
        { pos: V3(-0.92, -0.09, 0), rx: 0.048, ry: 0.045, dorsalRidge: 0.1, ventral: 0.35 },
        { pos: V3(-0.46, -0.02, 0), rx: 0.12, ry: 0.12, dorsalRidge: 0.1, ribBulge: 0.1, ventral: 0.7 },
        { pos: V3(-0.06, 0.04, 0), rx: 0.23, ry: 0.22, dorsalRidge: 0.1, ribBulge: 0.18, keel: 0.16, ventral: 1.0 },
        { pos: V3(0.24, 0.12, 0), rx: 0.2, ry: 0.19, dorsalRidge: 0.08, ribBulge: 0.14, keel: 0.12, ventral: 0.95 },
        { pos: V3(0.42, 0.3, 0), rx: 0.11, ry: 0.1, dorsalRidge: 0.06, ventral: 0.85 },
      ];

  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: plumageMat,
    radialSegments: 32,
    tubularSegments: 64,
    tailEndU: cfg.isModernAvian ? 0.28 : 0.48,
    neckStartU: 0.78,
    tailSegmentCount: cfg.isModernAvian ? 2 : 5,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  // Sculpted Avian / Archaeopteryx Skull + Keratinous Beak (+ tiny ancestral teeth for Archaeopteryx)
  const { headGroup, jawPivot } = buildSculptedSkull({
    length: 0.44,
    height: 0.2,
    width: 0.14,
    snoutTaper: 0.26,
    snoutDrop: -0.03,
    browRidge: 0.1,
    nasalBoss: 0.06,
    premaxNotch: 0.0,
    jugalFlare: 0.12,
    jawDepth: 0.3,
    hasBeak: true,
    toothCount: cfg.isModernAvian ? 0 : 4,
    toothLength: 0.02,
    toothRadius: 0.005,
    toothCurl: 0.2,
    skinMat: plumageMat,
    darkMat: plumageMat,
    beakMat,
    toothMat,
    palateMat: mouthMat,
  });
  headGroup.position.set(-0.04, -0.02, 0);
  spineBody.headMount.add(headGroup);

  const eyes = attachEyes(headGroup, plumageMat, {
    x: 0.11,
    y: 0.04,
    z: 0.11,
    radius: 0.028,
    preset: EYE_PRESETS.avian,
    gazeForward: 0.28,
    gazeUp: 0.05,
  });
  attachNostrils(headGroup, { x: 0.24, y: 0.02, z: 0.028, r: 0.009 });

  // Feathered Wings: primaries + secondaries + coverts (+ 3 clawed wing fingers for Archaeopteryx)
  const wings = [];
  [-1, 1].forEach((side) => {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(0.08, 0.12, side * 0.2);
    const addLayer = (mat, count, length, width, yOff, spreadScale) => {
      const fan = buildFeatherFan(mat, {
        count,
        length,
        width,
        spread: -side * Math.PI * 0.42 * spreadScale,
        startAngle: -side * 0.08,
        taper: 0.22,
        curl: 0.08,
      });
      fan.position.y = yOff;
      orientYToward(fan, new THREE.Vector3(0, 0, side), new THREE.Vector3(0, 1, 0));
      fan.traverse((c) => {
        if (c.isMesh) c.userData.appendage = true;
      });
      wingPivot.add(fan);
    };
    addLayer(wingPlumeMat, 11, 0.92, 0.11, 0.0, 1.0);
    addLayer(wingPlumeMat, 9, 0.64, 0.11, 0.012, 0.9);
    addLayer(covertMat, 8, 0.38, 0.1, 0.024, 0.85);
    if (!cfg.isModernAvian) {
      for (let d = 0; d < 3; d++) {
        const wClaw = buildCurvedTooth(0.045, 0.009, clawMat, 0.35);
        wClaw.rotation.z = -Math.PI / 2.2;
        wClaw.position.set(0.14 - d * 0.03, 0.02, side * (0.34 + d * 0.04));
        wingPivot.add(wClaw);
      }
    }
    bodyGroup.add(wingPivot);
    wings.push({ wingPivot, side });
  });

  // Frond-Feathered Tail (long bony Archaeopteryx frond vanes or modern pygostyle fan)
  if (!cfg.isModernAvian) {
    spineBody.tailSegments.forEach((seg, idx) => {
      [-1, 1].forEach((side) => {
        const vane = buildFeatherFan(wingPlumeMat, {
          count: 4,
          length: 0.28 * (1 - idx * 0.08),
          width: 0.075,
          spread: 0.36,
          taper: 0.14,
          curl: 0.04,
        });
        vane.position.set(0, 0, side * 0.025);
        orientYToward(vane, new THREE.Vector3(-0.38, 0, side), new THREE.Vector3(0, 1, 0));
        vane.traverse((c) => {
          if (c.isMesh) c.userData.appendage = true;
        });
        seg.add(vane);
      });
    });
  }
  const tailFan = buildFeatherFan(wingPlumeMat, {
    count: cfg.isModernAvian ? 9 : 7,
    length: cfg.isModernAvian ? 0.48 : 0.32,
    width: 0.085,
    spread: Math.PI * 0.42,
    taper: 0.24,
    curl: 0.05,
  });
  orientYToward(tailFan, new THREE.Vector3(-1, -0.05, 0), new THREE.Vector3(0, 1, 0));
  tailFan.traverse((c) => {
    if (c.isMesh) c.userData.appendage = true;
  });
  spineBody.tailTipMount.add(tailFan);

  // Articulated 3-Toed Avian Legs with scaly tarsi & curved talons
  const legs = [];
  const legBoneGroups = [];
  [-1, 1].forEach((side, idx) => {
    const limb = buildArticulatedLimb({
      side,
      thighLen: 0.22,
      shinLen: 0.28,
      footLen: 0.18,
      thighR: 0.075,
      shinR: 0.036,
      toeCount: 3,
      clawLen: 0.05,
      clawR: 0.012,
      digitigrade: true,
      sickleClaw: !cfg.isModernAvian, // Archaeopteryx hyperextensible second toe
      skinMat: legMat,
      clawMat,
      legBoneGroups,
    });
    limb.hipGroup.position.set(-0.08, -0.1, side * 0.14);
    if (cfg.hasFourWings) {
      const hindWing = buildFeatherFan(wingPlumeMat, {
        count: 8,
        length: 0.44,
        width: 0.085,
        spread: -side * Math.PI * 0.34,
        startAngle: -side * 0.06,
        taper: 0.22,
        curl: 0.06,
      });
      hindWing.position.set(-0.02, -0.14, side * 0.02);
      orientYToward(hindWing, new THREE.Vector3(-0.35, -0.2, side), new THREE.Vector3(0, 1, 0));
      hindWing.traverse((c) => {
        if (c.isMesh) c.userData.appendage = true;
      });
      limb.kneeGroup.add(hindWing);
    }
    bodyGroup.add(limb.hipGroup);
    legs.push({ ...limb, phase: idx * Math.PI });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headGroup, spineBody.tailSegments, legBoneGroups, anatMats, { ribRadius: 0.22 });

  return {
    group: root,
    headGroup,
    jawPivot,
    gait: { walk: 4.2, sprint: 7.5 },
    locomotion: 'fly',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 7.5 : 4.2;
      const flap = Math.sin(time * spd);
      bodyGroup.position.y = 0.2 + Math.cos(time * spd) * 0.1;

      const neckYaw = Math.sin(time * 1.9) * 0.1;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: 0.12,
        tailSwayY: 0.08,
        neckPitch: Math.sin(time * 2.5) * 0.1,
        neckYaw,
        breath: Math.sin(time * 3.4) * 0.025,
      });

      headGroup.rotation.z = Math.cos(time * 2.5) * 0.1;
      headGroup.rotation.y = neckYaw * 0.7;
      jawPivot.rotation.z = -(whatIf ? 0.28 + Math.abs(Math.sin(time * 6)) * 0.2 : Math.max(0, Math.sin(time * 2.3)) * 0.16);

      wings.forEach(({ wingPivot, side }) => {
        wingPivot.rotation.x = side * flap * 0.56;
      });
      legs.forEach(({ hipGroup, kneeGroup, phase }) => {
        hipGroup.rotation.z = -0.35 + Math.sin(time * spd + phase) * 0.16;
        kneeGroup.rotation.z = -0.45;
      });
    },
  };
}

// -----------------------------------------------------------------------------
// 9. PARAMETRIC MARINE REPTILE RIGS (Mosasaurus, Ichthyosaurus, Plesiosaurus)
// -----------------------------------------------------------------------------
function buildParametricMarinePredator(species, cfg, anatMats) {
  const root = new THREE.Group();
  const isIchthyo = species.rigType === 'ichthyosaur';

  const skinMat = makePBRMaterial(
    `marine_${species.id}`,
    cfg.primaryColor || '#1e293b',
    '#475569',
    skinOptions(species, cfg, {
      roughness: 0.28,
      bumpScale: 0.05,
      cells: 30,
      wet: true,
      dorsalShade: 0.62,
      ventralShade: 1.32,
    })
  );
  const toothMat = makeKeratinMaterial('tooth', { gradientAxis: 'u' });
  const mouthMat = makeSoftTissueMaterial('#3f0f16');

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // One continuous hydrodynamic body loft from narrow caudal peduncle through fusiform torso to neck
  const spineStations = isIchthyo
    ? [
        { pos: V3(-2.05, 0.0, 0), rx: 0.035, ry: 0.055, dorsalRidge: 0.18, ventral: 0.35 },
        { pos: V3(-1.45, 0.0, 0), rx: 0.12, ry: 0.16, dorsalRidge: 0.16, ventral: 0.6 },
        { pos: V3(-0.82, 0.01, 0), rx: 0.28, ry: 0.32, dorsalRidge: 0.12, ribBulge: 0.14, ventral: 0.88 },
        { pos: V3(-0.1, 0.03, 0), rx: 0.42, ry: 0.46, dorsalRidge: 0.1, ribBulge: 0.22, keel: 0.1, ventral: 1.0 },
        { pos: V3(0.45, 0.02, 0), rx: 0.36, ry: 0.38, dorsalRidge: 0.08, ribBulge: 0.16, ventral: 0.95 },
        { pos: V3(0.76, 0.01, 0), rx: 0.26, ry: 0.27, dorsalRidge: 0.06, ventral: 0.88 },
      ]
    : [
        { pos: V3(-2.35, 0.0, 0), rx: 0.03, ry: 0.075, dorsalRidge: 0.22, ventral: 0.25 },
        { pos: V3(-1.72, 0.0, 0), rx: 0.11, ry: 0.19, dorsalRidge: 0.2, ventral: 0.5 },
        { pos: V3(-1.05, 0.01, 0), rx: 0.24, ry: 0.3, dorsalRidge: 0.16, ribBulge: 0.14, ventral: 0.78 },
        { pos: V3(-0.35, 0.02, 0), rx: 0.38, ry: 0.42, dorsalRidge: 0.14, ribBulge: 0.22, ventral: 1.0 },
        { pos: V3(0.32, 0.03, 0), rx: 0.4, ry: 0.43, dorsalRidge: 0.12, ribBulge: 0.22, keel: 0.08, ventral: 1.0 },
        { pos: V3(0.78, 0.02, 0), rx: 0.29, ry: 0.31, dorsalRidge: 0.1, ribBulge: 0.12, ventral: 0.9 },
      ];

  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 36,
    tubularSegments: 76,
    tailEndU: 0.52,
    neckStartU: 0.84,
    tailSegmentCount: 6,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  // Ichthyosaurus Dorsal Fin (hydrofoil)
  if (isIchthyo) {
    const dorsalFin = buildFinMesh({
      length: 0.5,
      widthAt: (t) => 0.36 * (1 - 0.75 * t),
      thickAt: (t) => 0.06 * (1 - 0.85 * t),
      sweep: 0.16,
      material: skinMat,
    });
    dorsalFin.rotation.x = -Math.PI / 2;
    dorsalFin.position.set(-0.02, 0.4, 0);
    bodyGroup.add(dorsalFin);
  }

  // Vertical Bilobed Caudal Fluke mounted on the deforming tail tip
  [1, -1].forEach((dir) => {
    const lobe = buildFinMesh({
      length: dir > 0 ? (isIchthyo ? 0.58 : 0.64) : isIchthyo ? 0.56 : 0.38,
      widthAt: (t) => 0.3 * (1 - 0.72 * t),
      thickAt: (t) => 0.055 * (1 - 0.85 * t),
      sweep: 0.32,
      material: skinMat,
    });
    lobe.rotation.set(-dir * (Math.PI / 2), 0, dir > 0 ? 0.24 : -0.24, 'ZYX');
    lobe.position.set(0.06, 0, 0);
    spineBody.tailTipMount.add(lobe);
  });

  // Sculpted Skull + Jaws (sleek dolphin rostrum for Ichthyosaurus, heavy varanoid skull for Mosasaurus)
  const { headGroup, jawPivot } = buildSculptedSkull({
    length: isIchthyo ? 0.94 : 0.92,
    height: isIchthyo ? 0.28 : 0.32,
    width: isIchthyo ? 0.22 : 0.26,
    snoutTaper: isIchthyo ? 0.22 : 0.48,
    snoutDrop: isIchthyo ? -0.02 : -0.01,
    browRidge: isIchthyo ? 0.1 : 0.16,
    nasalBoss: isIchthyo ? 0.06 : 0.12,
    premaxNotch: 0.0,
    jugalFlare: isIchthyo ? 0.12 : 0.2,
    jawDepth: isIchthyo ? 0.32 : 0.4,
    toothCount: isIchthyo ? 11 : 8,
    toothLength: isIchthyo ? 0.042 : 0.068,
    toothRadius: isIchthyo ? 0.008 : 0.015,
    toothCurl: 0.22,
    skinMat,
    darkMat: skinMat,
    toothMat,
    palateMat: mouthMat,
  });
  headGroup.position.set(-0.06, -0.02, 0);
  spineBody.headMount.add(headGroup);

  const eyes = attachEyes(headGroup, skinMat, {
    x: isIchthyo ? 0.18 : 0.2,
    y: isIchthyo ? 0.06 : 0.08,
    z: isIchthyo ? 0.18 : 0.21,
    radius: isIchthyo ? 0.068 : 0.042,
    preset: isIchthyo ? EYE_PRESETS.deepMarine : EYE_PRESETS.marine,
    gazeForward: 0.28,
    gazeUp: 0.06,
  });
  attachNostrils(headGroup, { x: isIchthyo ? 0.28 : 0.64, y: isIchthyo ? 0.08 : 0.07, z: 0.045, r: 0.014 });

  // 4 Hydrofoil Flippers
  const flippers = [];
  const legBoneGroups = [];
  [
    [0.44, -0.18, 0.36, 0, 1.15],
    [0.44, -0.18, -0.36, Math.PI, 1.15],
    [-0.48, -0.16, 0.3, Math.PI * 0.5, 0.85],
    [-0.48, -0.16, -0.3, Math.PI * 1.5, 0.85],
  ].forEach(([fx, fy, fz, phase, sc]) => {
    const flipPivot = new THREE.Group();
    flipPivot.position.set(fx, fy, fz);
    const side = fz > 0 ? 1 : -1;
    const paddle = buildFinMesh({
      length: 0.58 * sc,
      widthAt: (t) => 0.3 * sc * (0.75 + 0.45 * Math.sin(t * Math.PI)) * (1 - 0.65 * t * t),
      thickAt: (t) => 0.07 * sc * (1 - 0.8 * t),
      sweep: 0.14 * sc,
      material: skinMat,
    });
    paddle.scale.z = side;
    paddle.rotation.x = side * 0.3;
    paddle.position.set(-0.05, -0.04, 0);
    flipPivot.add(paddle);
    bodyGroup.add(flipPivot);
    flippers.push({ flipPivot, phase, side });
    legBoneGroups.push({ group: flipPivot, length: 0.4 * sc, radius: 0.03, yOffset: -0.06 });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headGroup, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup,
    jawPivot,
    gait: { walk: 2.8, sprint: 5.2 },
    locomotion: 'swim',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 5.2 : 2.8;
      const cyc = time * spd;
      bodyGroup.rotation.y = Math.sin(cyc) * 0.07;

      const neckYaw = Math.sin(cyc + 0.4) * 0.1;
      spineBody.deform(time, {
        speed: spd,
        swimMode: true,
        tailSwayZ: whatIf ? 0.52 : 0.36,
        tailSwayY: 0.02,
        neckPitch: Math.sin(time * 2.0) * 0.04,
        neckYaw,
        breath: Math.sin(time * 2.4) * 0.02,
      });

      headGroup.rotation.y = neckYaw * 0.6;
      jawPivot.rotation.z = -(whatIf ? 0.35 + Math.abs(Math.sin(time * 6)) * 0.26 : Math.max(0, Math.sin(time * 2.2)) * 0.24);
      flippers.forEach(({ flipPivot, phase, side }) => {
        flipPivot.rotation.x = side * Math.sin(cyc + phase) * 0.35;
      });
    },
  };
}

function buildParametricPlesiosaur(species, cfg, anatMats) {
  const root = new THREE.Group();
  const skinMat = makePBRMaterial(
    `plesio_${species.id}`,
    cfg.primaryColor || '#0f4c5c',
    '#1e293b',
    skinOptions(species, cfg, {
      roughness: 0.32,
      bumpScale: 0.05,
      cells: 28,
      wet: true,
      dorsalShade: 0.64,
      ventralShade: 1.3,
    })
  );
  const toothMat = makeKeratinMaterial('tooth', { gradientAxis: 'u' });
  const mouthMat = makeSoftTissueMaterial('#3f0f16');

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isPlio = !!cfg.isPliosaur;
  // One continuous seamless hydrofoil loft from tapered tail tip through broad tear-drop body and neck
  const spineStations = isPlio
    ? [
        { pos: V3(-1.42, -0.04, 0), rx: 0.026, ry: 0.032, dorsalRidge: 0.14, ventral: 0.25 },
        { pos: V3(-0.98, -0.02, 0), rx: 0.14, ry: 0.13, dorsalRidge: 0.12, ventral: 0.55 },
        { pos: V3(-0.48, 0.0, 0), rx: 0.42, ry: 0.32, dorsalRidge: 0.1, ribBulge: 0.26, bellyFlat: 0.2, ventral: 0.95 },
        { pos: V3(0.05, 0.02, 0), rx: 0.54, ry: 0.38, dorsalRidge: 0.1, ribBulge: 0.32, bellyFlat: 0.22, ventral: 1.0 },
        { pos: V3(0.55, 0.03, 0), rx: 0.42, ry: 0.32, dorsalRidge: 0.1, ribBulge: 0.24, bellyFlat: 0.18, ventral: 0.95 },
        { pos: V3(0.92, 0.04, 0), rx: 0.28, ry: 0.25, dorsalRidge: 0.08, ventral: 0.9 },
      ]
    : [
        { pos: V3(-1.42, -0.04, 0), rx: 0.026, ry: 0.032, dorsalRidge: 0.14, ventral: 0.25 },
        { pos: V3(-1.02, -0.02, 0), rx: 0.12, ry: 0.11, dorsalRidge: 0.12, ventral: 0.55 },
        { pos: V3(-0.56, 0.0, 0), rx: 0.38, ry: 0.28, dorsalRidge: 0.08, ribBulge: 0.26, bellyFlat: 0.22, ventral: 0.95 },
        { pos: V3(0.0, 0.02, 0), rx: 0.52, ry: 0.36, dorsalRidge: 0.08, ribBulge: 0.32, bellyFlat: 0.25, ventral: 1.0 },
        { pos: V3(0.54, 0.04, 0), rx: 0.36, ry: 0.26, dorsalRidge: 0.08, ribBulge: 0.22, bellyFlat: 0.2, ventral: 0.95 },
        { pos: V3(0.96, 0.1, 0), rx: 0.15, ry: 0.14, dorsalRidge: 0.06, ventral: 0.85 },
        { pos: V3(1.44, 0.2, 0), rx: 0.11, ry: 0.1, dorsalRidge: 0.06, ventral: 0.85 },
        { pos: V3(1.92, 0.3, 0), rx: 0.09, ry: 0.085, dorsalRidge: 0.05, ventral: 0.85 },
        { pos: V3(2.26, 0.36, 0), rx: 0.08, ry: 0.075, dorsalRidge: 0.05, ventral: 0.85 },
      ];

  const spineBody = buildDeformingSpineBody({
    stations: spineStations,
    material: skinMat,
    radialSegments: 36,
    tubularSegments: 80,
    tailEndU: 0.26,
    neckStartU: isPlio ? 0.78 : 0.54,
    tailSegmentCount: 4,
  });
  bodyGroup.add(spineBody.mesh, spineBody.headMount, spineBody.tailTipMount);
  spineBody.tailSegments.forEach((s) => bodyGroup.add(s));

  // Small vertical diamond tail fin on the tip of the short steering tail
  const tailFin = buildFinMesh({
    length: 0.26,
    widthAt: (t) => 0.16 * Math.sin(t * Math.PI),
    thickAt: (t) => 0.03 * (1 - 0.7 * t),
    sweep: 0.08,
    material: skinMat,
  });
  tailFin.rotation.x = -Math.PI / 2;
  tailFin.position.set(0.08, 0.0, 0);
  spineBody.tailTipMount.add(tailFin);

  // Streamlined Hydrodynamic Skull (delicate fish-trap for Plesiosaurs OR massive 1.8x macro-predator skull for Pliosaurs)
  const skScale = isPlio ? (cfg.skullScale || 1.85) : 1.0;
  const { headGroup, jawPivot } = buildSculptedSkull({
    length: (isPlio ? 0.62 : 0.46) * skScale,
    height: (isPlio ? 0.22 : 0.16) * skScale,
    width: (isPlio ? 0.18 : 0.13) * skScale,
    snoutTaper: 0.45,
    snoutDrop: -0.02,
    browRidge: isPlio ? 0.16 : 0.1,
    nasalBoss: isPlio ? 0.12 : 0.06,
    premaxNotch: isPlio ? 0.28 : 0.15,
    jugalFlare: isPlio ? 0.2 : 0.14,
    jawDepth: isPlio ? 0.42 : 0.34,
    toothCount: 8,
    toothLength: 0.045 * skScale,
    toothRadius: 0.008 * skScale,
    toothCurl: 0.24,
    skinMat,
    darkMat: skinMat,
    toothMat,
    palateMat: mouthMat,
  });
  headGroup.position.set(-0.04, -0.02, 0);
  spineBody.headMount.add(headGroup);

  const eyes = attachEyes(headGroup, skinMat, {
    x: 0.12 * skScale,
    y: 0.04 * skScale,
    z: 0.09 * skScale,
    radius: 0.026 * skScale,
    preset: EYE_PRESETS.marine,
    gazeForward: 0.28,
    gazeUp: 0.08,
  });
  attachNostrils(headGroup, { x: 0.24 * skScale, y: 0.04 * skScale, z: 0.025 * skScale, r: 0.009 * skScale });

  // 4 Long Sea-Turtle-Style Hydrofoil Wing-Flippers
  const flippers = [];
  const legBoneGroups = [];
  [
    [0.38, -0.1, 0.45, 0],
    [0.38, -0.1, -0.45, 0],
    [-0.38, -0.1, 0.45, Math.PI * 0.65],
    [-0.38, -0.1, -0.45, Math.PI * 0.65],
  ].forEach(([fx, fy, fz, phase]) => {
    const flipPivot = new THREE.Group();
    flipPivot.position.set(fx, fy, fz);
    const side = fz > 0 ? 1 : -1;
    const wing = buildFinMesh({
      length: 0.82,
      widthAt: (t) => 0.32 * (0.7 + 0.5 * Math.sin(t * Math.PI * 0.9)) * (1 - 0.5 * t * t),
      thickAt: (t) => 0.065 * (1 - 0.8 * t),
      sweep: 0.18,
      material: skinMat,
    });
    wing.scale.z = side;
    wing.position.set(-0.04, 0, 0);
    flipPivot.add(wing);
    bodyGroup.add(flipPivot);
    flippers.push({ flipPivot, phase, side });
    legBoneGroups.push({ group: flipPivot, length: 0.65, radius: 0.03, yOffset: 0 });
  });

  const anat = attachInternalAnatomyAndSkeleton(bodyGroup, headGroup, spineBody.tailSegments, legBoneGroups, anatMats);

  return {
    group: root,
    headGroup,
    jawPivot,
    gait: { walk: 2.4, sprint: 4.5 },
    locomotion: 'swim',
    anat,
    eyes,
    animate(time, whatIf = false) {
      const spd = whatIf ? 4.5 : 2.4;
      const cyc = time * spd;
      bodyGroup.position.y = Math.sin(cyc) * 0.06;

      const neckYaw = Math.sin(time * 1.8) * (whatIf ? 0.34 : 0.22);
      const neckPitch = Math.cos(time * 1.5) * 0.1;
      spineBody.deform(time, {
        speed: spd,
        tailSwayZ: 0.18,
        tailSwayY: 0.04,
        neckPitch,
        neckYaw,
        breath: Math.sin(time * 2.3) * 0.024,
      });

      headGroup.rotation.y = neckYaw * 0.65;
      headGroup.rotation.z = neckPitch * 0.6;
      jawPivot.rotation.z = -(whatIf ? 0.3 + Math.abs(Math.sin(time * 5.5)) * 0.22 : Math.max(0, Math.sin(time * 2.1)) * 0.18);

      flippers.forEach(({ flipPivot, phase, side }) => {
        flipPivot.rotation.x = side * Math.sin(cyc + phase) * 0.45;
      });
    },
  };
}

// =============================================================================
// 10. 3D HUMAN-TO-DINO SCALE COMPARATOR BUILDER
//     Renders a 10-Year-Old Kid (1.4m), Adult Paleontologist (1.8m), and
//     Yellow School Bus (11.0m) scaled proportionally against the active dinosaur!
// =============================================================================
export function buildScaleReferenceGroup(species) {
  const group = new THREE.Group();
  const dinoLengthM = Math.max(0.8, species.metrics?.lengthM || 9.0);

  // Real GLB rig in the Lab spans ~3.4 world units in length
  const worldUnitsPerMeter = 3.4 / dinoLengthM;
  const clampedScale = Math.max(0.08, Math.min(1.45, worldUnitsPerMeter));

  // Shared museum-grade holographic blueprint materials
  const buildHumanFigure = (heightM, colorHex, emissiveHex, withHat = false) => {
    const fig = new THREE.Group();
    const h = heightM * clampedScale;
    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      emissive: emissiveHex,
      emissiveIntensity: 0.32,
      roughness: 0.28,
      metalness: 0.1,
      clearcoat: 0.6,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.42,
    });

    // Articulated torso, pelvis, neck, head, arms, and legs
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.105, h * 0.30, 8, 14), mat);
    torso.position.y = h * 0.60;
    const head = new THREE.Mesh(new THREE.SphereGeometry(h * 0.095, 16, 14), skinMat);
    head.position.y = h * 0.90;
    fig.add(torso, head);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.042, h * 0.36, 6, 10), mat);
      leg.position.set(0, h * 0.24, side * h * 0.062);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.032, h * 0.26, 6, 10), mat);
      arm.position.set(0, h * 0.58, side * h * 0.145);
      arm.rotation.x = side * 0.08;
      fig.add(leg, arm);
    });

    if (withHat) {
      const hatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.16, h * 0.17, h * 0.022, 16), hatMat);
      brim.position.y = h * 0.97;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(h * 0.095, 14, 10), hatMat);
      crown.scale.set(1.0, 0.65, 1.0);
      crown.position.y = h * 0.99;
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, h * 1.12, 8),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      rod.position.set(h * 0.18, h * 0.56, h * 0.14);
      fig.add(brim, crown, rod);
    }

    // Ground pedestal ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(h * 0.16, h * 0.21, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    fig.add(ring);

    return fig;
  };

  // 1. 10-Year-Old Kid (1.4m tall)
  const kidGroup = buildHumanFigure(1.4, 0x38bdf8, 0x0284c7, false);
  kidGroup.position.set(0.72, -1.03, 1.62);
  group.add(kidGroup);

  // 2. Adult Paleontologist (1.8m tall) with Metric Survey Rod
  const adultGroup = buildHumanFigure(1.8, 0x10b981, 0x059669, true);
  adultGroup.position.set(1.24, -1.03, 1.62);
  group.add(adultGroup);

  // 3. Sculpted Type-C School Bus Scale Backdrop (11.0m long × 3.0m tall)
  //    Positioned behind the dinosaur (z = -2.45) with architectural blueprint wireframe + window strip
  //    so it never blocks or washes out the dinosaur's legs!
  const busL = 11.0 * clampedScale;
  const busH = 3.0 * clampedScale;
  const busW = 2.4 * clampedScale;
  const busGroup = new THREE.Group();

  const busMat = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    emissive: 0xb45309,
    emissiveIntensity: 0.18,
    roughness: 0.32,
    metalness: 0.12,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const busEdgeMat = new THREE.LineBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.68,
  });
  const windowMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });

  // Main cabin body (86% of length)
  const cabinL = busL * 0.86;
  const cabinH = busH * 0.72;
  const cabinGeo = new THREE.BoxGeometry(cabinL, cabinH, busW);
  const busBody = new THREE.Mesh(cabinGeo, busMat);
  busBody.position.set(-busL * 0.07, busH * 0.54, 0);
  busGroup.add(busBody);
  const cabinEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cabinGeo), busEdgeMat);
  cabinEdges.position.copy(busBody.position);
  busGroup.add(cabinEdges);

  // Rounded roof cap
  const roofGeo = new THREE.CylinderGeometry(busW * 0.48, busW * 0.5, cabinL, 12, 1, false, 0, Math.PI);
  roofGeo.rotateZ(Math.PI / 2);
  const roofMesh = new THREE.Mesh(roofGeo, busMat);
  roofMesh.scale.set(1, 0.22, 1);
  roofMesh.position.set(-busL * 0.07, busH * 0.90, 0);
  busGroup.add(roofMesh);

  // Front engine hood (14% of length)
  const hoodL = busL * 0.14;
  const hoodH = busH * 0.42;
  const hoodGeo = new THREE.BoxGeometry(hoodL, hoodH, busW * 0.88);
  const busHood = new THREE.Mesh(hoodGeo, busMat);
  busHood.position.set(busL * 0.43, busH * 0.39, 0);
  busGroup.add(busHood);
  const hoodEdges = new THREE.LineSegments(new THREE.EdgesGeometry(hoodGeo), busEdgeMat);
  hoodEdges.position.copy(busHood.position);
  busGroup.add(hoodEdges);

  // Side passenger windows + black rub rails
  const winStripGeo = new THREE.PlaneGeometry(cabinL * 0.92, cabinH * 0.34);
  [-1, 1].forEach((side) => {
    const winStrip = new THREE.Mesh(winStripGeo, windowMat);
    winStrip.position.set(-busL * 0.07, busH * 0.64, side * (busW * 0.502));
    if (side < 0) winStrip.rotation.y = Math.PI;
    busGroup.add(winStrip);
  });

  // Wheels with rims
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    transparent: true,
    opacity: 0.72,
  });
  [-busL * 0.32, busL * 0.34].forEach((wx) => {
    [-busW * 0.48, busW * 0.48].forEach((wz) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(busH * 0.18, busH * 0.18, busW * 0.12, 18),
        wheelMat
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, busH * 0.18, wz);
      busGroup.add(wheel);
    });
  });

  busGroup.position.set(0, -1.03, -2.45);
  group.add(busGroup);

  return group;
}

// =============================================================================
// 11. ERA HABITAT DIORAMA BUILDER (Multi-Species Prehistoric Ecosystems)
//     Creatures can be deferred (`deferCreatures: true`) and spawned during idle
//     frames so the lab becomes interactive instantly.
// =============================================================================
export function buildEraHabitatDiorama(era, eraSpeciesList, options = {}) {
  const group = new THREE.Group();

  // Sculpted Prehistoric Terrain Island Platform
  const groundMat = makePBRMaterial(`eraGround_${era.id}`, era.groundPrimary, era.groundSecondary, {
    style: 'ground',
    roughness: 0.82,
    bumpScale: 0.16,
    scale: 10,
  });
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 4.8, 0.52, 64), groundMat);
  const uv = baseDisc.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 6);
  baseDisc.position.y = -1.32;
  baseDisc.receiveShadow = true;
  group.add(baseDisc);

  // Glowing Paleo-Portal Rim Ring
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(5.65, 0.065, 12, 72),
    new THREE.MeshBasicMaterial({ color: era.themeColor })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -1.06;
  group.add(rim);

  // Era-Specific Prehistoric Flora (Conifers, Tree Ferns, Cycads, Volcanoes, or Kelp)
  const trunkMat = makePBRMaterial('paleoBark', '#6b4423', '#2b1a0e', { style: 'bark', roughness: 0.9, bumpScale: 0.14 });
  const frondMat = makePBRMaterial('paleoFoliage', '#2f6b2a', '#8fd16a', { style: 'foliage', roughness: 0.62, naturalize: 'foliage', bumpScale: 0.06 });

  for (let t = 0; t < 7; t++) {
    const angle = (t / 7) * Math.PI * 2 + 0.35;
    const dist = 3.8 + (t % 2) * 0.85;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;

    if (era.id === 'permian' && t % 3 === 0) {
      // Permian Volcanic Basalt Vent
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.35, 24), groundMat);
      cone.position.set(tx, -0.45, tz);
      cone.castShadow = true;
      cone.receiveShadow = true;
      const lava = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      lava.position.set(tx, 0.18, tz);
      group.add(cone, lava);
    } else {
      // Araucaria Conifer / Tree Fern
      const h = 1.4 + (t % 3) * 0.55;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, h, 12), trunkMat);
      trunk.position.set(tx, -1.06 + h * 0.5, tz);
      trunk.castShadow = true;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.15, 14), frondMat);
      crown.position.set(tx, -1.06 + h + 0.35, tz);
      crown.castShadow = true;
      crown.receiveShadow = true;
      group.add(trunk, crown);
    }
  }

  // Populate Habitat with up to 4 Iconic Species from this Era!
  const creatureInstances = [];
  const featured = eraSpeciesList.slice(0, 4);
  const placements = [
    { pos: [-1.45, -0.22, 0.55], rotY: 0.35, scale: 0.86 },
    { pos: [1.55, -0.22, 0.45], rotY: 2.65, scale: 0.82 },
    { pos: [-0.25, -0.22, -1.65], rotY: -0.45, scale: 0.78 },
    { pos: [0.35, 1.45, -0.65], rotY: 0.85, scale: 0.72 },
  ];

  const spawnCreature = (sp, idx) => {
    const slot = placements[idx] || placements[0];
    const rig = buildPrehistoricCreature(sp, slot.scale);
    const isFlyer = sp.domain === 'Sky';
    const isSwimmer = sp.domain === 'Ocean';
    rig.group.position.set(
      slot.pos[0],
      isFlyer ? 1.55 + (idx % 2) * 0.4 : isSwimmer ? 0.35 : slot.pos[1],
      slot.pos[2]
    );
    rig.group.rotation.y = slot.rotY;
    rig.group.userData = { speciesId: sp.id };
    group.add(rig.group);
    const instance = { rig, species: sp, isFlyer, basePos: rig.group.position.clone(), idx };
    creatureInstances.push(instance);
    return instance;
  };

  const pendingSpecies = featured.map((sp, idx) => ({ sp, idx }));
  if (!options.deferCreatures) {
    while (pendingSpecies.length) {
      const { sp, idx } = pendingSpecies.shift();
      spawnCreature(sp, idx);
    }
  }

  return {
    group,
    creatureInstances,
    pendingSpecies,
    spawnCreature,
    /** Spawns the next deferred creature; returns the instance or null when done. */
    spawnNext() {
      const next = pendingSpecies.shift();
      if (!next) return null;
      return spawnCreature(next.sp, next.idx);
    },
    update(elapsed, whatIf = false) {
      creatureInstances.forEach(({ rig, isFlyer, basePos, idx }) => {
        rig.animate(elapsed + idx * 1.3, whatIf);
        if (isFlyer) {
          rig.group.position.x = basePos.x + Math.cos(elapsed * 0.9 + idx) * 1.4;
          rig.group.position.z = basePos.z + Math.sin(elapsed * 0.9 + idx) * 1.2;
          rig.group.rotation.y = -elapsed * 0.9 - idx;
        }
      });
    },
  };
}


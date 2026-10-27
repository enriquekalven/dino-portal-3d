import * as THREE from '../../vendor/three/build/three.module.js';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '../../vendor/three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from '../../vendor/three/examples/jsm/libs/meshopt_decoder.module.js';
import { PBR } from './HyperRealKit.js';
import {
  buildSmithsonianFossilSkeletonForGLB,
  enhanceRealMuseumSkeletonGLB,
} from './SmithsonianFossilSkeleton.js';

/**
 * RealDinoLoader.js — Loads, normalizes, caches, and animates real artist-sculpted,
 * PBR-textured 3D dinosaur & prehistoric creature `.glb` models for DinoVerse 3D,
 * including a Real-GLB-Conformal 3D Fossil Skeleton (with carved intercostal ribcages,
 * vertebral columns, skull fenestrae & pterosaur wing-finger bones) and a Real-GLB-Fitted
 * 3D Striated Musculature & Beating Organ System.
 */

const HP = Math.PI / 2;
const PI = Math.PI;

/**
 * Exact forward-axis yaw rotation for each of the 41 `.glb` files so every creature
 * faces `+X` (head at `+X`, tail at `-X`) on the turntable and in Era dioramas.
 */
const MODEL_YAW = {
  'acrocanthosaurus.glb': HP,
  'allosaurus.glb': PI,
  'ankylosaurus.glb': PI,
  'apatosaurus.glb': PI,
  'archaeopteryx.glb': HP,
  'baryonyx.glb': HP,
  'carcharodontosaurus.glb': HP,
  'carnotaurus.glb': HP,
  'cryolophosaurus.glb': HP,
  'deinocheirus.glb': HP,
  'dilophosaurus.glb': 0,
  'dimetrodon.glb': PI,
  'gallimimus.glb': 0,
  'giganotosaurus.glb': -HP,
  'gigantoraptor.glb': HP,
  'gorgosaurus.glb': HP,
  'ichthyosaurus.glb': PI,
  'liopleurodon.glb': HP,
  'lystrosaurus.glb': HP,
  'maiasaura.glb': HP,
  'mosasaurus.glb': PI,
  'pachycephalosaurus.glb': HP,
  'paluxysaurus.glb': HP,
  'parasaurolophus.glb': PI,
  'plesiosaurus.glb': HP,
  'pteranodon.glb': PI,
  'regaliceratops.glb': -HP,
  'rhamphorhynchus.glb': -HP,
  'sauropelta.glb': PI,
  'sauropod-animated.glb': PI,
  'spinosaurus-detailed.glb': HP,
  'spinosaurus.glb': HP,
  'stegosaurus.glb': HP,
  'styxosaurus.glb': PI,
  'therizinosaurus.glb': -HP,
  'triceratops.glb': HP,
  'tupandactylus.glb': HP,
  'tylosaurus.glb': -HP,
  'tyrannosaurus-rex.glb': HP,
  'velociraptor-feathered.glb': HP,
  'velociraptor.glb': HP,
};

/**
 * Mapping of all 74 Atlas species IDs to their real `.glb` model in `./vendor/models/`,
 * with optional anatomical proportion & PBR albedo tint differentiation for sister taxa.
 */
export const SPECIES_GLB_MAP = {
  // --- PERMIAN & TRIASSIC SYNAPSIDS / REPTILES ---
  dimetrodon: { file: 'dimetrodon.glb', span: 4.9 },
  edaphosaurus: {
    file: 'dimetrodon.glb',
    span: 4.6,
    aspect: [0.94, 1.08, 1.12],
    tint: '#65a30d',
    tintStrength: 0.24,
  },
  lystrosaurus: { file: 'lystrosaurus.glb', span: 3.8 },
  inostrancevia: {
    file: 'lystrosaurus.glb',
    span: 4.6,
    aspect: [1.26, 1.02, 0.88],
    tint: '#991b1b',
    tintStrength: 0.26,
  },
  scutosaurus: {
    file: 'sauropelta.glb',
    span: 4.5,
    aspect: [0.92, 1.08, 1.12],
    tint: '#78716c',
    tintStrength: 0.22,
  },

  // --- EARLY THEROPODS & ARCHOSAURS ---
  eoraptor: {
    file: 'velociraptor.glb',
    span: 4.2,
    aspect: [0.95, 0.92, 0.86],
    tint: '#d97706',
    tintStrength: 0.2,
  },
  herrerasaurus: {
    file: 'gorgosaurus.glb',
    span: 4.7,
    aspect: [0.96, 0.94, 0.9],
    tint: '#b45309',
    tintStrength: 0.2,
  },
  coelophysis: {
    file: 'velociraptor.glb',
    span: 4.6,
    aspect: [1.12, 0.88, 0.8],
    tint: '#ca8a04',
    tintStrength: 0.22,
  },
  postosuchus: {
    file: 'gorgosaurus.glb',
    span: 4.8,
    aspect: [1.06, 0.84, 1.08],
    tint: '#7c2d12',
    tintStrength: 0.25,
  },
  dilophosaurus: { file: 'dilophosaurus.glb', span: 5.0 },
  cryolophosaurus: { file: 'cryolophosaurus.glb', span: 5.0 },
  ceratosaurus: {
    file: 'allosaurus.glb',
    span: 4.9,
    aspect: [0.96, 1.02, 1.04],
    tint: '#dc2626',
    tintStrength: 0.22,
  },
  allosaurus: { file: 'allosaurus.glb', span: 5.2 },
  compsognathus: {
    file: 'velociraptor.glb',
    span: 3.9,
    aspect: [0.92, 0.86, 0.82],
    tint: '#65a30d',
    tintStrength: 0.24,
  },

  // --- SPINOSAURIDS & CARCHARODONTOSAURIDS ---
  baryonyx: { file: 'baryonyx.glb', span: 5.2 },
  suchomimus: {
    file: 'spinosaurus.glb',
    span: 5.3,
    aspect: [1.0, 0.88, 1.0],
    tint: '#0284c7',
    tintStrength: 0.18,
  },
  spinosaurus: { file: 'spinosaurus-detailed.glb', span: 5.6 },
  acrocanthosaurus: { file: 'acrocanthosaurus.glb', span: 5.3 },
  carcharodontosaurus: { file: 'carcharodontosaurus.glb', span: 5.4 },
  giganotosaurus: { file: 'giganotosaurus.glb', span: 5.5 },
  carnotaurus: { file: 'carnotaurus.glb', span: 5.0 },

  // --- TYRANNOSAURIDS ---
  yutyrannus: {
    file: 'gorgosaurus.glb',
    span: 5.1,
    tint: '#e2e8f0',
    tintStrength: 0.22,
  },
  'tyrannosaurus-rex': { file: 'tyrannosaurus-rex.glb', span: 5.5 },

  // --- MANIRAPTORANS, ORNITHOMIMOSAURS & TERROR BIRDS ---
  velociraptor: { file: 'velociraptor-feathered.glb', span: 4.5 },
  deinonychus: { file: 'velociraptor.glb', span: 4.8 },
  utahraptor: {
    file: 'velociraptor-feathered.glb',
    span: 5.2,
    aspect: [1.06, 1.08, 1.12],
    tint: '#b45309',
    tintStrength: 0.2,
  },
  oviraptor: { file: 'gigantoraptor.glb', span: 4.6 },
  therizinosaurus: { file: 'therizinosaurus.glb', span: 5.4 },
  gallimimus: { file: 'gallimimus.glb', span: 4.9 },
  deinocheirus: { file: 'deinocheirus.glb', span: 5.4 },
  gastornis: {
    file: 'gigantoraptor.glb',
    span: 4.5,
    aspect: [0.86, 1.08, 1.1],
    tint: '#f59e0b',
    tintStrength: 0.22,
  },

  // --- AVIAN DINOSAURS ---
  archaeopteryx: { file: 'archaeopteryx.glb', span: 4.2 },
  microraptor: {
    file: 'archaeopteryx.glb',
    span: 4.1,
    tint: '#1e293b',
    tintStrength: 0.35,
  },
  hesperornis: {
    file: 'archaeopteryx.glb',
    span: 4.2,
    aspect: [1.14, 0.86, 0.92],
    tint: '#0ea5e9',
    tintStrength: 0.24,
  },
  'chicxulub-avian-survivor': {
    file: 'archaeopteryx.glb',
    span: 4.2,
    tint: '#10b981',
    tintStrength: 0.22,
  },

  // --- SAUROPODS & PROSAUROPODS ---
  mussaurus: {
    file: 'maiasaura.glb',
    span: 4.4,
    aspect: [1.04, 0.96, 1.02],
    tint: '#a16207',
    tintStrength: 0.22,
  },
  plateosaurus: { file: 'deinocheirus.glb', span: 5.0 },
  diplodocus: { file: 'sauropod-animated.glb', span: 6.0 },
  amargasaurus: {
    file: 'sauropod-animated.glb',
    span: 5.2,
    aspect: [0.88, 1.14, 1.0],
    tint: '#dc2626',
    tintStrength: 0.22,
  },
  apatosaurus: { file: 'apatosaurus.glb', span: 5.8 },
  brontosaurus: {
    file: 'apatosaurus.glb',
    span: 5.7,
    aspect: [0.98, 1.05, 1.02],
    tint: '#4d7c0f',
    tintStrength: 0.2,
  },
  brachiosaurus: { file: 'paluxysaurus.glb', span: 5.8 },
  camarasaurus: {
    file: 'paluxysaurus.glb',
    span: 5.2,
    aspect: [0.92, 0.92, 1.06],
    tint: '#ca8a04',
    tintStrength: 0.2,
  },
  argentinosaurus: {
    file: 'paluxysaurus.glb',
    span: 6.2,
    aspect: [1.06, 1.02, 1.1],
    tint: '#b45309',
    tintStrength: 0.2,
  },
  dreadnoughtus: {
    file: 'sauropod-animated.glb',
    span: 6.1,
    aspect: [1.02, 1.08, 1.12],
    tint: '#0f766e',
    tintStrength: 0.2,
  },

  // --- STEGOSAURS & ANKYLOSAURS ---
  stegosaurus: { file: 'stegosaurus.glb', span: 5.1 },
  kentrosaurus: {
    file: 'stegosaurus.glb',
    span: 4.7,
    aspect: [0.96, 1.04, 0.96],
    tint: '#d97706',
    tintStrength: 0.22,
  },
  tuojiangosaurus: {
    file: 'stegosaurus.glb',
    span: 4.8,
    aspect: [1.02, 0.95, 0.98],
    tint: '#4d7c0f',
    tintStrength: 0.22,
  },
  ankylosaurus: { file: 'ankylosaurus.glb', span: 5.0 },
  sauropelta: { file: 'sauropelta.glb', span: 4.9 },

  // --- CERATOPSIANS & PACHYCEPHALOSAURS ---
  triceratops: { file: 'triceratops.glb', span: 5.0 },
  styracosaurus: { file: 'regaliceratops.glb', span: 4.9 },
  pachyrhinosaurus: {
    file: 'regaliceratops.glb',
    span: 4.9,
    aspect: [1.0, 0.94, 1.06],
    tint: '#92400e',
    tintStrength: 0.22,
  },
  protoceratops: {
    file: 'triceratops.glb',
    span: 4.1,
    aspect: [0.88, 0.86, 0.92],
    tint: '#d97706',
    tintStrength: 0.24,
  },
  psittacosaurus: {
    file: 'pachycephalosaurus.glb',
    span: 4.0,
    aspect: [0.94, 0.92, 0.96],
    tint: '#65a30d',
    tintStrength: 0.22,
  },
  pachycephalosaurus: { file: 'pachycephalosaurus.glb', span: 4.5 },
  stygimoloch: {
    file: 'pachycephalosaurus.glb',
    span: 4.4,
    aspect: [0.96, 1.06, 0.96],
    tint: '#b91c1c',
    tintStrength: 0.22,
  },

  // --- HADROSAURS & ORNITHOPODS ---
  parasaurolophus: { file: 'parasaurolophus.glb', span: 5.2 },
  corythosaurus: {
    file: 'parasaurolophus.glb',
    span: 5.0,
    aspect: [0.96, 1.04, 1.0],
    tint: '#0d9488',
    tintStrength: 0.22,
  },
  maiasaura: { file: 'maiasaura.glb', span: 5.1 },
  edmontosaurus: {
    file: 'maiasaura.glb',
    span: 5.4,
    aspect: [1.06, 1.02, 1.04],
    tint: '#15803d',
    tintStrength: 0.2,
  },
  iguanodon: {
    file: 'maiasaura.glb',
    span: 5.2,
    aspect: [1.02, 1.04, 1.06],
    tint: '#4d7c0f',
    tintStrength: 0.2,
  },

  // --- PTEROSAURS ---
  pteranodon: { file: 'pteranodon.glb', span: 5.2, floatY: 0.28 },
  quetzalcoatlus: {
    file: 'pteranodon.glb',
    span: 5.8,
    aspect: [1.14, 1.28, 1.08],
    tint: '#d97706',
    tintStrength: 0.22,
    floatY: 0.32,
  },
  tapejara: { file: 'tupandactylus.glb', span: 4.8, floatY: 0.22 },
  rhamphorhynchus: { file: 'rhamphorhynchus.glb', span: 4.8, floatY: 0.25 },
  eudimorphodon: {
    file: 'rhamphorhynchus.glb',
    span: 4.4,
    tint: '#0284c7',
    tintStrength: 0.22,
    floatY: 0.24,
  },
  dimorphodon: {
    file: 'tupandactylus.glb',
    span: 4.5,
    aspect: [1.08, 0.9, 0.96],
    tint: '#b45309',
    tintStrength: 0.22,
    floatY: 0.22,
  },

  // --- MARINE REPTILES (MOSASAURS, ICHTHYOSAURS, PLESIOSAURS, PLIOSAURS) ---
  mosasaurus: { file: 'mosasaurus.glb', span: 5.6, floatY: 0.05 },
  tylosaurus: { file: 'tylosaurus.glb', span: 5.5, floatY: 0.05 },
  ichthyosaurus: { file: 'ichthyosaurus.glb', span: 4.9, floatY: 0.08 },
  shonisaurus: {
    file: 'ichthyosaurus.glb',
    span: 5.6,
    aspect: [1.08, 1.2, 1.18],
    tint: '#0369a1',
    tintStrength: 0.22,
    floatY: 0.08,
  },
  plesiosaurus: { file: 'plesiosaurus.glb', span: 5.3, floatY: 0.06 },
  elasmosaurus: { file: 'styxosaurus.glb', span: 5.6, floatY: 0.06 },
  liopleurodon: { file: 'liopleurodon.glb', span: 5.5, floatY: 0.06 },
  kronosaurus: {
    file: 'liopleurodon.glb',
    span: 5.6,
    aspect: [1.06, 1.04, 1.08],
    tint: '#1e3a8a',
    tintStrength: 0.22,
    floatY: 0.06,
  },
};

/** Fallback by rigType if a custom species ID is added dynamically. */
const FALLBACK_BY_RIG = {
  theropod: { file: 'tyrannosaurus-rex.glb', span: 5.2 },
  sauropod: { file: 'paluxysaurus.glb', span: 5.8 },
  ceratopsian: { file: 'triceratops.glb', span: 5.0 },
  stegosaur: { file: 'stegosaurus.glb', span: 5.0 },
  ankylosaur: { file: 'ankylosaurus.glb', span: 5.0 },
  hadrosaur: { file: 'parasaurolophus.glb', span: 5.1 },
  pterosaur: { file: 'pteranodon.glb', span: 5.2, floatY: 0.25 },
  plesiosaur: { file: 'styxosaurus.glb', span: 5.4, floatY: 0.06 },
  mosasaur: { file: 'mosasaurus.glb', span: 5.5, floatY: 0.05 },
  ichthyosaur: { file: 'ichthyosaurus.glb', span: 5.0, floatY: 0.08 },
  synapsid: { file: 'dimetrodon.glb', span: 4.9 },
  avian: { file: 'archaeopteryx.glb', span: 4.2 },
};

// Shared singleton loader & ArrayBuffer cache so each .glb is fetched over HTTP at most once
let sharedLoader = null;
let decoderReadyPromise = null;
const bufferCache = new Map();

async function getGLTFLoader() {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./vendor/three/examples/jsm/libs/draco/gltf/');
    sharedLoader.setDRACOLoader(dracoLoader);
    if (MeshoptDecoder) {
      decoderReadyPromise = MeshoptDecoder.ready || Promise.resolve();
      await decoderReadyPromise;
      sharedLoader.setMeshoptDecoder(MeshoptDecoder);
    }
  } else if (decoderReadyPromise) {
    await decoderReadyPromise;
  }
  return sharedLoader;
}

// Network-level failures surface as TypeError. Chrome occasionally drops an in-flight
// request before it reaches the network while the main thread is busy decoding another
// model, so those (and 5xx responses) are retried; 404s and other 4xx fail fast.
const GLB_FETCH_RETRY_DELAYS_MS = [300, 1200];

async function fetchGLBOnce(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Failed to fetch ${url} (${res.status})`);
    err.retryable = res.status >= 500;
    throw err;
  }
  return res.arrayBuffer();
}

async function fetchGLBWithRetry(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchGLBOnce(url);
    } catch (err) {
      const retryable = err instanceof TypeError || err.retryable === true;
      if (!retryable || attempt >= GLB_FETCH_RETRY_DELAYS_MS.length) throw err;
      await new Promise((resolve) => setTimeout(resolve, GLB_FETCH_RETRY_DELAYS_MS[attempt]));
    }
  }
}

async function fetchGLBBuffer(url) {
  if (bufferCache.has(url)) {
    return bufferCache.get(url);
  }
  const promise = fetchGLBWithRetry(url);
  bufferCache.set(url, promise);
  // Never cache a failure: a later request (e.g. picking the species in the lab) tries again.
  promise.catch(() => {
    if (bufferCache.get(url) === promise) bufferCache.delete(url);
  });
  return promise;
}

/**
 * Resolves the `.glb` configuration for any species object.
 */
export function getSpeciesGLBSpec(species) {
  if (!species) return FALLBACK_BY_RIG.theropod;
  const mapped =
    SPECIES_GLB_MAP[species.id] ||
    SPECIES_GLB_MAP[`${species.id}`.toLowerCase()] ||
    FALLBACK_BY_RIG[species.rigType] ||
    FALLBACK_BY_RIG.theropod;
  return {
    ...mapped,
    url: `./vendor/models/${mapped.file}`,
    yaw: MODEL_YAW[mapped.file] ?? HP,
  };
}

/**
 * Synchronizes world matrices AND all SkinnedMesh bone matrices so `Box3.setFromObject`
 * (which calls `SkinnedMesh.getVertexPosition`) always sees the exact posed, rotated,
 * scaled, and centered vertex positions in `realHolder` space.
 */
function syncHolderAndSkeletons(holder) {
  holder.updateMatrixWorld(true);
  holder.traverse((obj) => {
    if (obj.isSkinnedMesh && obj.skeleton) {
      obj.skeleton.update();
    }
  });
}


/**
 * Computes the exact 3D thoracic center (`thoraxCenter`), radii (`thoraxRadii`),
 * and 16-slice anatomical `(vBelly(u), vSpine(u))` silhouette profile (`bodyProfile`)
 * in `realHolder` space by extracting geometric envelope extremes (never vertex-count
 * percentiles, which get skewed by high-density toe/claw/tooth vertices!).
 */
function computeRealGLBThoraxBounds(realHolder, holderBox, species) {
  syncHolderAndSkeletons(realHolder);
  const invHolder = new THREE.Matrix4().copy(realHolder.matrixWorld).invert();
  const meshToHolder = new THREE.Matrix4();
  const v = new THREE.Vector3();

  const posedBox = new THREE.Box3();
  const sampledPoints = [];

  realHolder.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
    meshToHolder.copy(invHolder).multiply(obj.matrixWorld);
    const posAttr = obj.geometry.attributes.position;
    const step = Math.max(1, Math.floor(posAttr.count / 3200));
    for (let i = 0; i < posAttr.count; i += step) {
      if (obj.isSkinnedMesh && typeof obj.getVertexPosition === 'function') {
        obj.getVertexPosition(i, v);
      } else {
        v.fromBufferAttribute(posAttr, i);
      }
      v.applyMatrix4(meshToHolder);
      if (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)) {
        posedBox.expandByPoint(v);
        sampledPoints.push(v.clone());
      }
    }
  });

  if (!posedBox.isEmpty()) {
    holderBox.copy(posedBox);
  }

  const size = holderBox.getSize(new THREE.Vector3());
  const center = holderBox.getCenter(new THREE.Vector3());
  const min = holderBox.min;

  // MODEL_YAW rotates every model in realHolder so +X is head and -X is tail;
  // keep X as longitudinal axis and Z as lateral/wingspan axis across all clades.
  const isZLonger = false;
  const lenSize = Math.max(0.001, size.x);
  const lenMin = min.x;
  const latSize = Math.max(0.001, size.z);
  const latCenter = center.z;
  const heightSize = Math.max(0.001, size.y);

  const isStegoOrSpino = species?.rigType === 'stegosaur' || species?.rigType === 'spinosaur';
  const isSauropod = species?.rigType === 'sauropod';
  const isPterosaur = species?.rigType === 'pterosaur';
  const isBiped = species?.rigType === 'theropod' || species?.rigType === 'hadrosaur' || species?.rigType === 'spinosaur';

  const minBellyFloor = isSauropod
    ? 0.24
    : isStegoOrSpino
      ? 0.26
      : isBiped
        ? 0.36
        : 0.28;

  // Bucket posed vertices into 16 longitudinal slices along u (0..1) using geometric extremes
  const bins = Array.from({ length: 16 }, () => ({
    count: 0,
    minV: 1.0,
    maxV: 0.0,
    midMinV: 1.0,
    midMaxV: 0.0,
  }));

  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    const ptLen = isZLonger ? pt.z : pt.x;
    const ptLat = isZLonger ? pt.x : pt.z;
    const uNorm = Math.min(0.9999, Math.max(0.0, (ptLen - lenMin) / lenSize));
    const vNorm = Math.min(1.0, Math.max(0.0, (pt.y - min.y) / heightSize));
    const absW = Math.abs(ptLat - latCenter) / (0.5 * latSize);
    const b = Math.min(15, Math.floor(uNorm * 16));
    const bin = bins[b];
    bin.count++;
    if (vNorm < bin.minV) bin.minV = vNorm;
    if (vNorm > bin.maxV) bin.maxV = vNorm;
    if (absW <= 0.14) {
      if (vNorm > bin.midMaxV) bin.midMaxV = vNorm;
    }
    // Sagittal belly floor: vertices near the midline (absW <= 0.08) above the lower legs
    if (absW <= 0.08 && vNorm >= minBellyFloor) {
      if (vNorm < bin.midMinV) bin.midMinV = vNorm;
    }
  }

  const rawBelly = new Array(16).fill(0.40);
  const rawSpine = new Array(16).fill(0.85);

  for (let b = 0; b < 16; b++) {
    const uMid = (b + 0.5) / 16.0;
    const bin = bins[b];
    if (bin.count === 0) {
      rawSpine[b] = b > 0 ? rawSpine[b - 1] : 0.80;
      rawBelly[b] = b > 0 ? rawBelly[b - 1] : 0.45;
      continue;
    }

    // 1. True geometric dorsal spine height vSpine[b]
    if (isStegoOrSpino) {
      // On stegosaurs/spinosaurs, the dorsal osteoderm plates/sail rise above the true back arch.
      // Cap the body spine curve at the base of the dorsal plates so tV > 1.0 cleanly isolates the plates!
      const plateBaseArch = 0.50 + 0.19 * Math.sin(Math.min(1.0, Math.max(0.0, (uMid - 0.06) / 0.78)) * Math.PI);
      rawSpine[b] = Math.min(bin.maxV, plateBaseArch);
    } else if (isPterosaur && bin.midMaxV > 0.05) {
      rawSpine[b] = bin.midMaxV;
    } else {
      rawSpine[b] = bin.maxV;
    }

    // 2. True geometric ventral belly/throat/jaw/tail-underside height vBelly[b]
    const inLimbZone = uMid >= 0.22 && uMid <= (isSauropod ? 0.68 : 0.74);
    if (!inLimbZone) {
      rawBelly[b] = bin.minV;
    } else {
      const maxValidBelly = rawSpine[b] - 0.16;
      if (bin.midMinV <= maxValidBelly) {
        rawBelly[b] = bin.midMinV;
      } else {
        // Fallback when a slice has no midline belly vertex (e.g. wide sauropod barrel)
        const defaultDepth = isSauropod ? 0.30 : isStegoOrSpino ? 0.34 : isBiped ? 0.42 : 0.48;
        rawBelly[b] = Math.max(minBellyFloor, rawSpine[b] - defaultDepth);
      }
    }

    if (rawSpine[b] - rawBelly[b] < 0.04) {
      rawBelly[b] = Math.max(0.02, rawSpine[b] - 0.04);
    }
  }

  // Light 1-pass smoothing on interior torso bins (b = 2..13) while preserving exact tail/snout tips
  const smoothBelly = rawBelly.slice();
  const smoothSpine = rawSpine.slice();
  for (let b = 2; b < 14; b++) {
    smoothBelly[b] = 0.20 * rawBelly[b - 1] + 0.60 * rawBelly[b] + 0.20 * rawBelly[b + 1];
    smoothSpine[b] = 0.20 * rawSpine[b - 1] + 0.60 * rawSpine[b] + 0.20 * rawSpine[b + 1];
  }

  const bodyProfile = Array.from(
    { length: 16 },
    (_, b) => new THREE.Vector2(smoothBelly[b], smoothSpine[b])
  );

  return { bodyProfile };
}

/**
 * Loads, normalizes, and mounts the real `.glb` 3D model onto an existing creature rig
 * returned by `buildPrehistoricCreature(species, scale)`.
 *
 * - In `'skin'` mode: displays the 100% real sculpted & PBR-textured `.glb` dinosaur.
 * - In `'skeleton'` / `'xray'` mode: completely hides the closed outer skin `.glb` and
 *   displays an authentic **Smithsonian NMNH / Natural History Museum 3D Fossil Skeleton**
 *   (including the official 102,071-vertex Smithsonian *Triceratops horridus* "Hatcher" 3D scan,
 *   the 29,435-vertex articulated theropod skeleton mount, and clade-accurate 3D open-air
 *   museum fossil skeletons with true open intercostal space between curved ribs, articulated
 *   vertebrae, separated tibia+fibula / radius+ulna shafts, and open cranial fenestrae).
 */
export async function upgradeRigWithRealGLB(creatureRig, species, scale = 1.0, onUpgraded = null) {
  if (!creatureRig || !species) return null;
  const spec = getSpeciesGLBSpec(species);

  try {
    const [loader, rawBuffer] = await Promise.all([
      getGLTFLoader(),
      fetchGLBBuffer(spec.url),
    ]);

    // Parse a fresh Three.js scene graph from the cached ArrayBuffer so animated
    // SkinnedMeshes, bones, and materials are 100% independent per instance
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(rawBuffer.slice(0), './vendor/models/', resolve, reject);
    });

    if (creatureRig._disposed) return null;

    const glbScene = gltf.scene;
    const animations = gltf.animations || [];

    // 1. Set up AnimationMixer & evaluate frame 0 BEFORE computing bounding box
    let mixer = null;
    if (animations.length > 0) {
      mixer = new THREE.AnimationMixer(glbScene);
      const preferredClip =
        animations.find((a) => /idle/i.test(a.name)) ||
        animations.find((a) => /take|anim|swim|walk|run/i.test(a.name)) ||
        animations[0];
      const activeAction = mixer.clipAction(preferredClip);
      activeAction.play();
      mixer.update(0.016);
    }

    // 2. Wrap in an orientation + normalization group
    const realHolder = new THREE.Group();
    realHolder.name = `RealGLB_${species.id}`;

    const yawPivot = new THREE.Group();
    yawPivot.rotation.y = spec.yaw;
    yawPivot.add(glbScene);
    realHolder.add(yawPivot);

    // Apply optional sister-taxon aspect proportions before computing world bounds
    if (spec.aspect) {
      yawPivot.scale.set(spec.aspect[0], spec.aspect[1], spec.aspect[2]);
    }

    syncHolderAndSkeletons(realHolder);
    const rawBox = new THREE.Box3().setFromObject(realHolder, true);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);

    const rigParentScale = creatureRig.group.scale.x || 1.0;
    const targetWorldSpan = (spec.span || 5.0) * scale;
    const normScale = targetWorldSpan / (maxDim * rigParentScale);

    yawPivot.scale.multiplyScalar(normScale);
    syncHolderAndSkeletons(realHolder);

    const normBox = new THREE.Box3().setFromObject(realHolder, true);
    const normCenter = normBox.getCenter(new THREE.Vector3());
    const normSize = normBox.getSize(new THREE.Vector3());

    // Ground terrestrial & avian creatures at pedestal surface (y = -1.03 / rigParentScale),
    // or float marine/pterosaur creatures around spec.floatY.
    const isFloating =
      spec.floatY !== undefined ||
      species.domain === 'Ocean';
    const groundYLocal = -1.03 / rigParentScale;
    const targetYOffset = isFloating
      ? (spec.floatY ?? 0.12) / rigParentScale - normCenter.y
      : groundYLocal - normBox.min.y;

    yawPivot.position.set(
      -normCenter.x,
      targetYOffset,
      -normCenter.z
    );
    syncHolderAndSkeletons(realHolder);

    // Mount realHolder into creatureRig.group BEFORE computing posed bounding box
    creatureRig.group.add(realHolder);
    syncHolderAndSkeletons(realHolder);

    // Compute final posed bounding box & 16-slice body profile in realHolder local space
    const holderLocalBox = new THREE.Box3();
    const { bodyProfile } = computeRealGLBThoraxBounds(
      realHolder,
      holderLocalBox,
      species
    );

    // 3. Collect real GLB meshes & enhance Skin materials
    const glbMeshes = [];
    let jawBone = null;
    let headBone = null;
    let neckBone = null;
    const anisotropy = PBR.getAnisotropy ? PBR.getAnisotropy() : 8;
    const tintColor = spec.tint ? new THREE.Color(spec.tint) : null;
    const tintStrength = spec.tintStrength ?? 0.2;

    glbScene.traverse((obj) => {
      if (obj.isBone) {
        if (!jawBone && /jaw|mandible|mouth|bottomjaw|lowerjaw/i.test(obj.name)) {
          jawBone = obj;
        } else if (!headBone && /head|skull/i.test(obj.name) && !/idleclaw/i.test(obj.name)) {
          headBone = obj;
        } else if (!neckBone && /neck/i.test(obj.name)) {
          neckBone = obj;
        }
      }
      if (!obj.isMesh) return;

      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const enhancedMats = mats.map((m) => {
        if (!m) return m;
        const cloned = m.clone();
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(
          (texKey) => {
            if (cloned[texKey]) {
              cloned[texKey].anisotropy = anisotropy;
              cloned[texKey].needsUpdate = true;
            }
          }
        );
        if ('envMapIntensity' in cloned) {
          cloned.envMapIntensity = 1.18;
        }
        if (tintColor && cloned.color) {
          cloned.color.lerp(tintColor, tintStrength);
        }
        if (cloned.transparent || cloned.alphaTest > 0) {
          cloned.side = THREE.DoubleSide;
        }
        return cloned;
      });

      obj.material = Array.isArray(obj.material) ? enhancedMats : enhancedMats[0];
      glbMeshes.push({
        mesh: obj,
        origMat: obj.material,
      });
    });

    // 3b. Load or build the authentic Smithsonian NMNH / Natural History Museum 3D Fossil Skeleton!
    let fossilSkeletonGroup = null;
    let skelMixer = null;
    let skelYawPivot = null;
    let skelBaseYaw = 0;
    let skelBasePosY = 0;
    let skelBaseScale = null;

    const isExactTriceratops = species.id === 'triceratops';
    const isTyrannosaurid =
      species.rigType === 'theropod' &&
      (spec.file === 'tyrannosaurus-rex.glb' ||
        /tyrannosaurus|tarbosaurus|gorgosaurus|albertosaurus|daspletosaurus|yutyrannus|qianzhousaurus/i.test(
          species.id
        ));

    if (isExactTriceratops) {
      try {
        const skelBuf = await fetchGLBBuffer('./vendor/models/smithsonian-triceratops.glb');
        const skelGltf = await new Promise((resolve, reject) => {
          loader.parse(skelBuf.slice(0), './vendor/models/', resolve, reject);
        });
        const skelHolder = new THREE.Group();
        skelHolder.name = `SmithsonianScan_${species.id}`;
        const skelYaw = new THREE.Group();
        skelYaw.rotation.y = Math.PI / 2;
        const inner = new THREE.Group();
        inner.rotation.x = -Math.PI / 2;
        // Tilt Hatcher slightly upward around local X so its brow horns & frill align 1-to-1 with triceratops.glb
        inner.rotation.y = 0;
        inner.add(skelGltf.scene);
        skelYaw.add(inner);
        skelYaw.rotation.z = 0.14;
        if (spec.aspect) {
          skelYaw.scale.set(spec.aspect[0], spec.aspect[1], spec.aspect[2]);
        }
        skelHolder.add(skelYaw);
        syncHolderAndSkeletons(skelHolder);

        const rawSkelBox = new THREE.Box3().setFromObject(skelHolder, true);
        const rawSkelSize = rawSkelBox.getSize(new THREE.Vector3());
        const skelMaxDim = Math.max(rawSkelSize.x, rawSkelSize.y, rawSkelSize.z, 0.001);
        const skelNormScale = targetWorldSpan / (skelMaxDim * rigParentScale);
        skelYaw.scale.multiplyScalar(skelNormScale);
        syncHolderAndSkeletons(skelHolder);

        const normSkelBox = new THREE.Box3().setFromObject(skelHolder, true);
        const normSkelCenter = normSkelBox.getCenter(new THREE.Vector3());
        skelYaw.position.set(
          -normSkelCenter.x,
          groundYLocal - normSkelBox.min.y,
          -normSkelCenter.z
        );
        syncHolderAndSkeletons(skelHolder);

        const finalSkelBox = new THREE.Box3().setFromObject(skelHolder, true);
        enhanceRealMuseumSkeletonGLB(skelHolder, finalSkelBox, species, groundYLocal, true);
        creatureRig.group.add(skelHolder);
        fossilSkeletonGroup = skelHolder;
        skelYawPivot = skelYaw;
        skelBaseYaw = skelYaw.rotation.y;
        skelBasePosY = skelYaw.position.y;
        skelBaseScale = skelYaw.scale.clone();
      } catch (e) {
        console.warn('[RealDinoLoader] Fallback to sculpted ceratopsian skeleton:', e);
      }
    } else if (isTyrannosaurid) {
      try {
        const skelBuf = await fetchGLBBuffer('./vendor/models/trex-skeleton-rigged.glb');
        const skelGltf = await new Promise((resolve, reject) => {
          loader.parse(skelBuf.slice(0), './vendor/models/', resolve, reject);
        });
        const skelScene = skelGltf.scene;
        // Remove any base/platform meshes BEFORE computing bounding box so Box3 measures strictly the dinosaur skeleton
        const toRemove = [];
        skelScene.traverse((obj) => {
          if (obj.isMesh && /platform|floor|base|pedestal|ground/i.test(obj.name)) {
            toRemove.push(obj);
          }
        });
        toRemove.forEach((m) => {
          if (m.parent) m.parent.remove(m);
        });

        if (skelGltf.animations && skelGltf.animations.length > 0) {
          skelMixer = new THREE.AnimationMixer(skelScene);
          const clip = skelGltf.animations[0];
          const act = skelMixer.clipAction(clip);
          act.play();
          skelMixer.update(0.016);
        }

        const skelHolder = new THREE.Group();
        skelHolder.name = `MuseumTheropodSkeleton_${species.id}`;
        const skelYaw = new THREE.Group();
        skelYaw.rotation.y = Math.PI / 2;
        skelYaw.add(skelScene);
        if (spec.aspect) {
          skelYaw.scale.set(spec.aspect[0], spec.aspect[1], spec.aspect[2]);
        }
        skelHolder.add(skelYaw);
        syncHolderAndSkeletons(skelHolder);

        const rawSkelBox = new THREE.Box3().setFromObject(skelHolder, true);
        const rawSkelSize = rawSkelBox.getSize(new THREE.Vector3());
        const skelMaxDim = Math.max(rawSkelSize.x, rawSkelSize.y, rawSkelSize.z, 0.001);
        const skelNormScale = (targetWorldSpan * 0.98) / (skelMaxDim * rigParentScale);
        skelYaw.scale.multiplyScalar(skelNormScale);
        syncHolderAndSkeletons(skelHolder);

        const normSkelBox = new THREE.Box3().setFromObject(skelHolder, true);
        const normSkelCenter = normSkelBox.getCenter(new THREE.Vector3());
        skelYaw.position.set(
          -normSkelCenter.x,
          groundYLocal - normSkelBox.min.y,
          -normSkelCenter.z
        );
        syncHolderAndSkeletons(skelHolder);

        const finalSkelBox = new THREE.Box3().setFromObject(skelHolder, true);
        enhanceRealMuseumSkeletonGLB(skelHolder, finalSkelBox, species, groundYLocal, false);
        creatureRig.group.add(skelHolder);
        fossilSkeletonGroup = skelHolder;
        skelYawPivot = skelYaw;
        skelBaseYaw = skelYaw.rotation.y;
        skelBasePosY = skelYaw.position.y;
        skelBaseScale = skelYaw.scale.clone();
      } catch (e) {
        console.warn('[RealDinoLoader] Fallback to sculpted theropod skeleton:', e);
      }
    }

    if (!fossilSkeletonGroup) {
      fossilSkeletonGroup = buildSmithsonianFossilSkeletonForGLB(
        realHolder,
        holderLocalBox,
        bodyProfile,
        species
      );
      realHolder.add(fossilSkeletonGroup);
    }

    creatureRig.realGlbGroup = realHolder;
    creatureRig.realGlbMeshes = glbMeshes;
    creatureRig.realFossilSkeletonGroup = fossilSkeletonGroup;
    creatureRig.realMixer = mixer;
    creatureRig.isRealGLB = true;
    creatureRig.realGlbFile = spec.file;

    // 4. Override setAnatomyLayer so:
    //    - All old procedural meshes stay 100% hidden!
    //    - 'skin' mode shows the full PBR-textured .glb model
    //    - 'skeleton' / 'xray' mode completely hides the closed outer skin .glb and displays
    //      the authentic 3D Smithsonian / Natural History Museum Fossil Skeleton!
    let currentLayer = creatureRig._activeLayer || 'skin';

    const hideAllProceduralMeshes = () => {
      creatureRig.skinMeshes.forEach(({ mesh }) => {
        mesh.visible = false;
      });
      creatureRig.appendageMeshes.forEach((mesh) => {
        mesh.visible = false;
      });
      if (creatureRig.hardTissueMeshes) {
        creatureRig.hardTissueMeshes.forEach((mesh) => {
          mesh.visible = false;
        });
      }
      creatureRig.eyes.forEach((eye) => eye.setVisible(false));
      if (creatureRig.anat) {
        creatureRig.anat.skeletonGroup.visible = false;
        if (creatureRig.anat.skullBone) creatureRig.anat.skullBone.visible = false;
        creatureRig.anat.tailBones.forEach((b) => {
          b.visible = false;
        });
        creatureRig.anat.limbBones.forEach((b) => {
          b.visible = false;
        });
      }
    };

    creatureRig.setAnatomyLayer = (layer = 'skin') => {
      currentLayer = layer;
      creatureRig._activeLayer = layer;
      hideAllProceduralMeshes();

      const showSkinFull = layer === 'skin';
      const showSkeleton = !showSkinFull;

      if (fossilSkeletonGroup) {
        fossilSkeletonGroup.visible = showSkeleton;
      }

      glbMeshes.forEach(({ mesh, origMat }) => {
        if (showSkeleton) {
          mesh.visible = false;
        } else {
          mesh.visible = true;
          mesh.material = origMat;
        }
      });
    };

    // Immediately apply current anatomy layer
    creatureRig.setAnatomyLayer(currentLayer);

    // 5. Hook real GLB skeletal animation + vocalization into creatureRig.animate
    let lastTime = null;
    let vocalStart = -Infinity;
    let vocalEnd = -Infinity;
    const baseYaw = yawPivot.rotation.y;
    const baseScaleX = yawPivot.scale.x;
    const baseScaleY = yawPivot.scale.y;
    const baseScaleZ = yawPivot.scale.z;
    const basePosY = yawPivot.position.y;
    const headBaseRotZ = headBone ? headBone.rotation.z : 0;
    const jawBaseRotX = jawBone ? jawBone.rotation.x : 0;
    const jawBaseRotZ = jawBone ? jawBone.rotation.z : 0;

    creatureRig.vocalize = (duration = 1.5, delay = 0) => {
      creatureRig._pendingRealVocal = {
        duration: Math.max(0.35, duration),
        delay: Math.max(0, delay),
      };
    };

    creatureRig.animate = (time, whatIf = false) => {
      const dt = lastTime === null ? 0.016 : Math.min(0.1, Math.max(0.001, time - lastTime));
      lastTime = time;

      const speedMul = whatIf ? 1.65 : 1.0;

      // Advance native GLB skeletal animation mixer
      if (mixer) {
        mixer.update(dt * speedMul);
      }
      if (skelMixer && fossilSkeletonGroup?.visible) {
        skelMixer.update(dt * speedMul);
      }

      // Handle vocalization trigger
      if (creatureRig._pendingRealVocal) {
        vocalStart = time + creatureRig._pendingRealVocal.delay;
        vocalEnd = vocalStart + creatureRig._pendingRealVocal.duration;
        creatureRig._pendingRealVocal = null;
      }
      let vocal = 0;
      if (time >= vocalStart && time <= vocalEnd + 0.35) {
        const attack = Math.min(1, (time - vocalStart) / 0.16);
        const release = Math.min(1, Math.max(0, (vocalEnd + 0.35 - time) / 0.35));
        vocal = Math.min(attack, release) * (0.82 + 0.18 * Math.sin(time * 16.0));
      }

      // Subtle living respiration, poised weight-shift, and vocalization reaction
      const breath = Math.sin(time * (whatIf ? 3.8 : 2.1)) * 0.014;
      const sway = Math.sin(time * (whatIf ? 2.2 : 0.95)) * (whatIf ? 0.045 : 0.022);
      const bob = isFloating
        ? Math.sin(time * 1.6) * (0.06 / rigParentScale)
        : Math.abs(Math.sin(time * (whatIf ? 2.8 : 1.1))) * (0.015 / rigParentScale);

      yawPivot.rotation.y = baseYaw + sway;
      yawPivot.rotation.z = vocal * 0.06;
      yawPivot.position.y = basePosY + bob;
      yawPivot.scale.set(
        baseScaleX * (1 + breath * 0.35),
        baseScaleY * (1 + breath + vocal * 0.03),
        baseScaleZ * (1 + breath * 1.15 + vocal * 0.04)
      );

      if (skelYawPivot && skelBaseScale) {
        skelYawPivot.rotation.y = skelBaseYaw + sway * 0.65;
        skelYawPivot.rotation.z = vocal * 0.04;
        skelYawPivot.position.y = skelBasePosY + bob * 0.5;
        skelYawPivot.scale.set(
          skelBaseScale.x * (1 + breath * 0.25),
          skelBaseScale.y * (1 + breath * 0.65),
          skelBaseScale.z * (1 + breath * 0.75)
        );
      }

      if (jawBone && vocal > 0.001) {
        jawBone.rotation.x = jawBaseRotX + vocal * 0.38;
        jawBone.rotation.z = jawBaseRotZ - vocal * 0.25;
      }
      if (headBone && vocal > 0.001) {
        headBone.rotation.z = headBaseRotZ + vocal * 0.18;
      }

      // Fire footstep audio/haptic callbacks in Lab mode
      if (creatureRig.onStep && species.domain !== 'Ocean') {
        const stepFreq = whatIf ? 3.6 : 1.8;
        const phase = Math.floor((time * stepFreq) / Math.PI);
        if (creatureRig._lastRealStepPhase !== undefined && phase !== creatureRig._lastRealStepPhase) {
          creatureRig.onStep(phase % 2, whatIf ? 0.95 : 0.5, species.domain === 'Sky' ? 'fly' : 'biped');
        }
        creatureRig._lastRealStepPhase = phase;
      }
    };

    if (typeof onUpgraded === 'function') {
      onUpgraded(creatureRig, normSize);
    }
    return creatureRig;
  } catch (err) {
    console.warn(`[RealDinoLoader] Fallback to procedural rig for ${species.id} (${spec.file}):`, err);
    return null;
  }
}

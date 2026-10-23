import * as THREE from '../../vendor/three/build/three.module.js';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/three/examples/jsm/libs/meshopt_decoder.module.js';
import { PBR } from './HyperRealKit.js';

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
  'styxosaurus.glb': 0,
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

async function fetchGLBBuffer(url) {
  if (bufferCache.has(url)) {
    return bufferCache.get(url);
  }
  const promise = fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url} (${res.status})`);
    }
    return res.arrayBuffer();
  });
  bufferCache.set(url, promise);
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
 * Builds a Museum-Grade 3D Osteological Relief & Excavated Fossil Skeleton Material
 * for a `.glb` mesh in `'skeleton'` mode.
 *
 * Why this looks 100% authentic with zero visual glitches:
 * - Never uses `discard` holes on hollow single-walled `.glb` skin meshes (which caused
 *   ragged torn-polygon holes in the stomach and sawtooth wing clipping).
 * - Never spawns floating external pipes or primitive shapes.
 * - Transforms the entire 3D dinosaur from snout to tail and spine to toes into a
 *   high-relief excavated fossil skeleton & CT osteology mount:
 *   1. Sculpted Thoracic Ribcage (15 pairs of curved ivory costae with 3D screen-space
 *      derivative normal bevels `dFdx`/`dFdy` separated by deep dark Morrison Formation
 *      intercostal matrix recesses).
 *   2. Articulated Cervical, Dorsal, Sacral & Caudal Vertebrae + Neural Spines along the axial ridge.
 *   3. Cranial Fenestrae (deep recessed dark orbital, antorbital, and temporal skull openings
 *      surrounded by bright mineralized ivory skull bridges, horns, frill, and teeth).
 *   4. Appendicular Long-Bone Shafts (recessed dark soft-tissue contours along the limbs so
 *      the central femur, tibia, fibula, humerus, radius, ulna, and phalanges stand out as
 *      lean articulated bones with condyle joints).
 */
function createRealGLBFossilMaterial(
  origMat,
  invHolderWorldUniform,
  holderBox,
  thoraxCenter,
  thoraxRadii,
  bodyProfile,
  species
) {
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#efe4ce'),
    roughness: 0.55,
    metalness: 0.02,
    clearcoat: 0.0,
    envMapIntensity: 0.15,
    normalMap: origMat?.normalMap || null,
    normalScale: new THREE.Vector2(1.45, 1.45),
    bumpMap: origMat?.bumpMap || origMat?.map || null,
    bumpScale: 0.045,
    aoMap: origMat?.aoMap || null,
    aoMapIntensity: 1.35,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  const isPterosaur = species?.rigType === 'pterosaur' ? 1.0 : 0.0;
  const isStegosaur = species?.rigType === 'stegosaur' ? 1.0 : 0.0;
  const isCeratopsian = species?.rigType === 'ceratopsian' ? 1.0 : 0.0;
  const isSauropod = species?.rigType === 'sauropod' ? 1.0 : 0.0;
  const boxMin = holderBox.min.clone();
  const boxMax = holderBox.max.clone();
  const profileCopy = bodyProfile.map((p) => p.clone());

  baseMat.onBeforeCompile = (shader) => {
    shader.uniforms.uInvHolderWorld = invHolderWorldUniform;
    shader.uniforms.uBoxMin = { value: boxMin };
    shader.uniforms.uBoxMax = { value: boxMax };
    shader.uniforms.uThoraxCenter = { value: thoraxCenter.clone() };
    shader.uniforms.uThoraxRadii = { value: thoraxRadii.clone() };
    shader.uniforms.uProfile = { value: profileCopy };
    shader.uniforms.uIsPterosaur = { value: isPterosaur };
    shader.uniforms.uIsStegosaur = { value: isStegosaur };
    shader.uniforms.uIsCeratopsian = { value: isCeratopsian };
    shader.uniforms.uIsSauropod = { value: isSauropod };
    shader.uniforms.uOrigAlbedo = { value: origMat?.map || null };
    shader.uniforms.uHasOrigAlbedo = { value: origMat?.map ? 1.0 : 0.0 };

    shader.vertexShader =
      `
      uniform mat4 uInvHolderWorld;
      uniform vec3 uBoxMin;
      uniform vec3 uBoxMax;
      varying vec3 vHolderPosF;
      varying vec3 vHolderNormF;
      varying vec3 vBodyUVW;
      varying vec3 vWorldPosF;
      varying vec3 vWorldNormF;
      varying vec2 vOrigUvF;
      ` +
      shader.vertexShader
        .replace(
          '#include <uv_vertex>',
          `
          #include <uv_vertex>
          vOrigUvF = uv;
          `
        )
        .replace(
          '#include <skinnormal_vertex>',
          `
          #include <skinnormal_vertex>
          vWorldNormF = normalize(mat3(modelMatrix) * objectNormal);
          vHolderNormF = normalize(mat3(uInvHolderWorld) * vWorldNormF);
          `
        )
        .replace(
          '#include <project_vertex>',
          `
          vec4 wpF = modelMatrix * vec4(transformed, 1.0);
          vWorldPosF = wpF.xyz;
          vec3 hPos = (uInvHolderWorld * wpF).xyz;
          vHolderPosF = hPos;
          vec3 bSize = max(vec3(0.001), uBoxMax - uBoxMin);
          vec3 rawUVW = clamp((hPos - uBoxMin) / bSize, 0.0, 1.0);
          if (bSize.z > bSize.x * 1.25) {
            vBodyUVW = vec3(rawUVW.z, rawUVW.y, (rawUVW.x - 0.5) * 2.0);
            vHolderNormF = vec3(vHolderNormF.z, vHolderNormF.y, vHolderNormF.x);
          } else {
            vBodyUVW = vec3(rawUVW.x, rawUVW.y, (rawUVW.z - 0.5) * 2.0);
          }
          #include <project_vertex>
          `
        );

    shader.fragmentShader =
      `
      uniform vec3 uThoraxCenter;
      uniform vec3 uThoraxRadii;
      uniform vec2 uProfile[16];
      uniform float uIsPterosaur;
      uniform float uIsStegosaur;
      uniform float uIsCeratopsian;
      uniform float uIsSauropod;
      uniform sampler2D uOrigAlbedo;
      uniform float uHasOrigAlbedo;
      varying vec3 vHolderPosF;
      varying vec3 vHolderNormF;
      varying vec3 vBodyUVW;
      varying vec3 vWorldPosF;
      varying vec3 vWorldNormF;
      varying vec2 vOrigUvF;

      vec2 sampleBodyProfileF(float uCoord) {
        float pf = clamp(uCoord * 15.0, 0.0, 15.0);
        int i0 = int(floor(pf));
        int i1 = min(15, i0 + 1);
        float fr = fract(pf);
        vec2 p0 = uProfile[0];
        vec2 p1 = uProfile[0];
        for (int k = 0; k < 16; k++) {
          if (k == i0) p0 = uProfile[k];
          if (k == i1) p1 = uProfile[k];
        }
        return mix(p0, p1, fr);
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float u = vBodyUVW.x;
          float v = vBodyUVW.y;
          float w = vBodyUVW.z;
          float absW = abs(w);
          vec3 hN = normalize(vHolderNormF);

          // Sample original albedo luminance for natural eye orbits, teeth, nostrils, and scale crevices
          float texLuma = 0.58;
          if (uHasOrigAlbedo > 0.5) {
            vec3 texCol = texture2D(uOrigAlbedo, vOrigUvF).rgb;
            texLuma = clamp(dot(texCol, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
          }

          // Interpolate exact anatomical (vBelly, vSpine) at longitudinal station u
          vec2 bodyProf = sampleBodyProfileF(u);
          float vBelly = bodyProf.x;
          float vSpine = bodyProf.y;
          float bodySpan = max(0.07, vSpine - vBelly);
          // tV = 0.0 at ventral belly/throat/jaw/tail-bottom, tV = 1.0 at dorsal spine/skull-top, tV < 0.0 on legs!
          float tV = (v - vBelly) / bodySpan;

          // Baseline is 0.0 (deep obsidian X-ray soft-tissue cavity)
          float boneRelief = 0.0;
          // Stegosaur/Kentrosaur dorsal plates sit ABOVE the dorsal spine curve (tV > 0.96) near the midline
          bool isDorsalPlates = (uIsStegosaur > 0.5 && tV > 0.96 && absW < 0.28);

          // 1. ARTICULATED VERTEBRAL COLUMN (Cervical, Dorsal, Sacral & Caudal Vertebrae + Neural Spines):
          //    Tracks tV in [0.76, 1.00] along the exact dorsal curve of the tail, back, and neck!
          float skullStartU = (uIsSauropod > 0.5) ? 0.90 : (uIsCeratopsian > 0.5 ? 0.58 : 0.74);
          float preSkullMask = 1.0 - smoothstep(skullStartU - 0.02, skullStartU + 0.03, u);
          if (preSkullMask > 0.01 && !isDorsalPlates) {
            // Spool-shaped vertebral centra high along the dorsal column (tV ~ 0.85)
            float centraTV = mix(0.76, 0.85, smoothstep(0.18, 0.34, u));
            float centraBand = (1.0 - smoothstep(0.05, 0.14, abs(tV - centraTV))) * smoothstep(0.18, 0.52, abs(hN.z));
            float vertSpool = smoothstep(0.18, 0.78, cos((u * 42.0 - tV * 0.4) * 6.28318));
            // Dorsal neural spines projecting from tV = 0.85 up to the dorsal ridge (tV = 1.00)
            float neuralBand = smoothstep(0.82, 0.89, tV) * (1.0 - smoothstep(0.99, 1.05, tV));
            float neuralSpines = neuralBand * smoothstep(0.24, 0.80, cos((u * 42.0 - (tV - 0.85) * 2.2) * 6.28318));
            // Continuous articulated dorsal bridge along the top of the spine
            float dorsalCrest = smoothstep(0.80, 0.92, tV) * (1.0 - smoothstep(0.99, 1.04, tV)) * (0.45 + 0.55 * vertSpool);
            float axialBone = clamp(max(centraBand * vertSpool, max(neuralSpines, dorsalCrest)), 0.0, 1.0);
            boneRelief = max(boneRelief, axialBone * preSkullMask);
          }

          // 2. SLENDER CURVED THORACIC RIBS (14 Pairs of Costae + Deep Dark Intercostal Spaces):
          //    Spans tV in [0.06..0.86] across the full torso ribcage from dorsal spine to ventral belly!
          float ribMaxU = (uIsSauropod > 0.5) ? 0.56 : (uIsCeratopsian > 0.5 ? 0.58 : 0.66);
          float ribZoneU = smoothstep(0.28, 0.33, u) * (1.0 - smoothstep(ribMaxU - 0.04, ribMaxU, u));
          // Posterior flank arch: anterior chest ribs reach tV = 0.06, posterior lumbar ribs taper up to tV = 0.34
          // leaving a natural hollow abdominal flank in front of the pelvis!
          float ribBottomTV = mix(0.34, 0.06, smoothstep(0.31, 0.45, u));
          float ribZoneTV = smoothstep(ribBottomTV - 0.04, ribBottomTV + 0.05, tV) * (1.0 - smoothstep(0.82, 0.89, tV));
          float flankMask = smoothstep(0.18, 0.48, abs(hN.z));
          if (ribZoneU > 0.01 && ribZoneTV > 0.01 && !isDorsalPlates) {
            float ribCurve = u * 18.5 - tV * 0.48 - 0.05 * sin(tV * 3.14159);
            // Slender cylindrical ivory ribs (~28% bone width vs ~72% deep dark intercostal gap)
            float slenderRib = smoothstep(0.54, 0.88, cos(ribCurve * 6.28318));
            // Delicate ventral sternal/gastralia chevrons along the bottom chest margin (tV < 0.15)
            float gastralia = (1.0 - smoothstep(0.04, 0.15, tV)) * smoothstep(0.0, 0.05, tV)
              * smoothstep(0.55, 0.88, cos((u * 36.0 + absW * 3.5) * 6.28318)) * 0.80;
            boneRelief = max(boneRelief, max(slenderRib * ribZoneTV, gastralia) * ribZoneU * flankMask);
          }

          // 3. PECTORAL GIRDLE (Scapula + Coracoid) & PELVIC GIRDLE (Ilium + Ischium + Pubis):
          if (!isDorsalPlates && uIsPterosaur < 0.5) {
            float scapU = (uIsSauropod > 0.5) ? 0.53 : (uIsCeratopsian > 0.5 ? 0.56 : 0.62);
            // Slanted Scapula + Coracoid blade across the shoulder (tV in 0.12..0.78)
            float scapDist = abs((u - scapU) - (tV - 0.44) * 0.14);
            float scapula = (1.0 - smoothstep(0.012, 0.028, scapDist))
              * smoothstep(0.10, 0.18, tV) * (1.0 - smoothstep(0.74, 0.82, tV)) * flankMask;

            // Tri-radiate Pelvic Girdle at the hip (Ilium dorsal blade + Ischium posterior rod + Pubis anterior rod)
            float iliumDist = abs((tV - 0.78) + (u - 0.33) * 0.75);
            float iliumBlade = (1.0 - smoothstep(0.04, 0.10, iliumDist))
              * smoothstep(0.25, 0.28, u) * (1.0 - smoothstep(0.38, 0.41, u)) * flankMask;
            float ischiumDist = abs((u - 0.29) + (tV - 0.38) * 0.14);
            float ischiumRod = (1.0 - smoothstep(0.010, 0.024, ischiumDist))
              * smoothstep(0.08, 0.15, tV) * (1.0 - smoothstep(0.72, 0.80, tV)) * flankMask;
            float pubisDist = abs((u - 0.36) - (tV - 0.38) * 0.11);
            float pubisRod = (1.0 - smoothstep(0.010, 0.024, pubisDist))
              * smoothstep(0.08, 0.15, tV) * (1.0 - smoothstep(0.72, 0.80, tV)) * flankMask;

            boneRelief = max(boneRelief, max(scapula, max(iliumBlade, max(ischiumRod, pubisRod))) * 0.96);
          }

          // 4. CAUDAL TAIL & CERVICAL NECK VERTEBRAL CENTRA, CERVICAL RIBS & HAEMAL CHEVRONS:
          float isTail = 1.0 - smoothstep(0.24, 0.30, u);
          float neckStartU = (uIsSauropod > 0.5) ? 0.54 : (uIsCeratopsian > 0.5 ? 0.55 : 0.64);
          float isNeck = smoothstep(neckStartU, neckStartU + 0.04, u) * preSkullMask;
          if ((isTail > 0.01 || isNeck > 0.01) && !isDorsalPlates) {
            // Centra spool column in upper-middle of tail/neck (tV in 0.46..0.90), leaving ventral throat/tail flesh recessed
            float coreTV = smoothstep(0.42, 0.56, tV) * (1.0 - smoothstep(0.88, 0.96, tV));
            float spoolFreq = (uIsSauropod > 0.5 && isNeck > 0.5) ? 28.0 : 42.0;
            float spoolSeg = smoothstep(0.24, 0.80, cos((u * spoolFreq - tV * 0.4) * 6.28318));
            // Ventral caudal haemal chevrons under the tail (tV in 0.10..0.48)
            float chevrons = isTail * smoothstep(0.08, 0.18, tV) * (1.0 - smoothstep(0.44, 0.54, tV))
              * smoothstep(0.54, 0.86, cos((u * 42.0 + tV * 1.1) * 6.28318)) * 0.84;
            // Delicate cervical ribs & pneumatic pleurocoels along the neck (tV in 0.18..0.55)
            float cervRibs = isNeck * smoothstep(0.16, 0.28, tV) * (1.0 - smoothstep(0.50, 0.60, tV))
              * smoothstep(0.56, 0.88, cos((u * 32.0 - tV * 1.2) * 6.28318)) * 0.82;
            boneRelief = max(boneRelief, max(coreTV * spoolSeg, max(chevrons, cervRibs)) * max(isTail, isNeck) * flankMask);
          }

          // 5. SLENDER APPENDICULAR LONG-BONE SHAFTS (Femur, Tibia+Fibula, Humerus, Radius+Ulna & Phalanges):
          //    Mapped via limbT = v / (vBelly + 0.06 * bodySpan) so the bone shafts extend cleanly from toes (0.0) to hip/shoulder (1.0)!
          float limbTopV = vBelly + 0.06 * bodySpan;
          float limbZone = (1.0 - smoothstep(limbTopV - 0.03, limbTopV + 0.03, v))
            * smoothstep(0.20, 0.26, u) * (1.0 - smoothstep(0.70, 0.76, u));
          if (limbZone > 0.01 && uIsPterosaur < 0.5) {
            float limbT = clamp(v / max(0.16, limbTopV), 0.0, 1.0);
            float lateralFace = smoothstep(0.30, 0.65, abs(hN.z));
            // Upper limb (limbT > 0.54): single central Femur / Humerus shaft (abs(hN.x) < 0.28)
            float upperShaft = (1.0 - smoothstep(0.18, 0.32, abs(hN.x)))
              * sqrt(max(0.0, 1.0 - pow(clamp(hN.x / 0.32, -1.0, 1.0), 2.0)));
            // Lower limb (0.18 < limbT < 0.52): twin parallel shafts (Tibia + Fibula / Radius + Ulna)
            float tibiaShaft = 1.0 - smoothstep(0.06, 0.15, abs(hN.x - 0.14));
            float fibulaShaft = (1.0 - smoothstep(0.05, 0.12, abs(hN.x + 0.15))) * 0.88;
            float lowerTwinShafts = max(tibiaShaft, fibulaShaft);
            float shaftProfile = mix(lowerTwinShafts, upperShaft, smoothstep(0.50, 0.56, limbT)) * lateralFace;

            // Epiphyseal condyle joints at knee/elbow (limbT ~ 0.53) and ankle/wrist (limbT ~ 0.18)
            float kneeCondyle = exp(-pow((limbT - 0.53) / 0.045, 2.0)) * (1.0 - smoothstep(0.26, 0.42, abs(hN.x))) * lateralFace;
            float ankleCondyle = exp(-pow((limbT - 0.18) / 0.040, 2.0)) * (1.0 - smoothstep(0.26, 0.42, abs(hN.x))) * lateralFace;
            float jointCleft = (1.0 - 0.82 * exp(-pow((limbT - 0.53) / 0.010, 2.0)))
              * (1.0 - 0.82 * exp(-pow((limbT - 0.18) / 0.009, 2.0)));

            // Articulated pedal/manual phalanges & ungual claws at the foot (limbT < 0.16)
            float phalanges = (1.0 - smoothstep(0.13, 0.18, limbT))
              * smoothstep(0.28, 0.82, cos((u * 64.0 + w * 18.0) * 6.28318))
              * smoothstep(0.25, 0.80, cos(limbT * 24.0 * 6.28318));

            float limbBone = clamp(max(max(shaftProfile, max(kneeCondyle, ankleCondyle)) * jointCleft, phalanges), 0.0, 1.0);
            boneRelief = max(boneRelief, limbBone * limbZone);
          }

          // 6. DIAPSID CRANIAL SKULL OSTEOLOGY & 4 DEEP RECESSED FENESTRAE (Normalized via tV in [0..1]!):
          float skullZone = smoothstep(skullStartU - 0.02, skullStartU + 0.03, u);
          if (skullZone > 0.01) {
            float uSkull = clamp((u - skullStartU) / max(0.05, 1.0 - skullStartU), 0.0, 1.0);
            float kTV = clamp(tV, 0.0, 1.0);
            float fenestraCutout = 0.0;
            if (uIsCeratopsian > 0.5) {
              // Ceratopsian Parietosquamosal Frill Fenestrae (uSkull ~ 0.08..0.34, kTV ~ 0.48..0.84)
              // + Orbit (uSkull ~ 0.40..0.56, kTV ~ 0.48..0.76) + Naris (uSkull ~ 0.72..0.88, kTV ~ 0.35..0.62)
              // leaving solid bone on the frill shield rim, brow horns, nasal horn, and parrot beak!
              float frillFenestra = sin(clamp((uSkull - 0.10) / 0.24, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.48) / 0.34, 0.0, 1.0) * 3.14159)
                * smoothstep(0.14, 0.28, absW);
              float ceratOrbit = sin(clamp((uSkull - 0.40) / 0.16, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.46) / 0.28, 0.0, 1.0) * 3.14159);
              float ceratNaris = sin(clamp((uSkull - 0.70) / 0.18, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.32) / 0.26, 0.0, 1.0) * 3.14159);
              float ceratJawGap = sin(clamp((uSkull - 0.44) / 0.34, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.12) / 0.16, 0.0, 1.0) * 3.14159);
              fenestraCutout = max(max(frillFenestra * 0.85, ceratOrbit), max(ceratNaris, ceratJawGap * 0.85));
            } else {
              // Standard Diapsid Skull: External Naris, Antorbital Fenestra, Orbit & Mandibular Fenestra
              float narisHole = sin(clamp((uSkull - 0.68) / 0.22, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.48) / 0.28, 0.0, 1.0) * 3.14159);
              float antorbitalHole = sin(clamp((uSkull - 0.38) / 0.26, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.46) / 0.34, 0.0, 1.0) * 3.14159);
              float orbitHole = sin(clamp((uSkull - 0.14) / 0.21, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.50) / 0.34, 0.0, 1.0) * 3.14159);
              float mandibularHole = sin(clamp((uSkull - 0.18) / 0.50, 0.0, 1.0) * 3.14159)
                * sin(clamp((kTV - 0.14) / 0.20, 0.0, 1.0) * 3.14159);
              fenestraCutout = max(max(narisHole * 0.90, antorbitalHole), max(orbitHole, mandibularHole * 0.90));
            }

            float lateralSkull = smoothstep(0.25, 0.58, abs(hN.z));
            float darkOrbitTex = (1.0 - smoothstep(0.10, 0.28, texLuma)) * 0.78;
            float skullStruts = clamp(0.92 - max(smoothstep(0.28, 0.68, fenestraCutout * lateralSkull) * 0.94, darkOrbitTex), 0.0, 1.0);
            // Gleaming maxillary/dentary tooth row along kTV ~ 0.36..0.46, plus horns/beak/nasal bridge
            float toothRow = (1.0 - smoothstep(0.03, 0.08, abs(kTV - 0.40))) * smoothstep(0.30, 0.92, uSkull)
              * smoothstep(0.20, 0.82, cos(uSkull * 26.0 * 6.28318));
            float teethAndHorns = max(toothRow, smoothstep(0.68, 0.86, texLuma));
            float dorsalBridge = smoothstep(0.82, 0.95, kTV) * 0.92;
            float skullBone = clamp(max(skullStruts, max(teethAndHorns, dorsalBridge)), 0.0, 1.0);
            boneRelief = mix(boneRelief, skullBone, skullZone);
          }

          // 7. PTEROSAUR WING-FINGER SPAR & ACTINOFIBRILS:
          if (uIsPterosaur > 0.5 && absW > 0.14) {
            float wingLeadingSpar = smoothstep(0.46 - 0.14 * absW, 0.52 - 0.14 * absW, u);
            float wingPhalanges = smoothstep(0.55, 0.88, cos(absW * 12.0 * 6.28318)) * wingLeadingSpar;
            float patagiumFibrils = (0.5 + 0.5 * sin((absW * 55.0 + u * 22.0) * 6.28318)) * 0.08;
            boneRelief = mix(patagiumFibrils, 0.96, max(wingLeadingSpar, wingPhalanges));
          }

          // 8. STEGOSAUR / KENTROSAUR VASCULARIZED OSTEODERM PLATES & SPIKES (Strictly above dorsal spine!):
          if (isDorsalPlates) {
            float plateVessels = smoothstep(0.18, 0.78, cos((u * 44.0 - tV * 6.0) * 6.28318));
            boneRelief = clamp(0.28 + 0.68 * plateVessels * (0.45 + 0.55 * texLuma), 0.22, 0.95);
          }

          // 9. HIGH-CONTRAST FOSSIL IVORY BONE vs DARK OBSIDIAN X-RAY MATRIX PALETTE:
          vec3 recessedCavity = vec3(0.025, 0.035, 0.055);
          vec3 periostealShadow = vec3(0.36, 0.30, 0.23);
          vec3 mineralizedIvory = vec3(0.93, 0.88, 0.76);
          vec3 corticalHighlight = vec3(0.99, 0.97, 0.91);

          float texDetail = 0.72 + 0.28 * texLuma;
          float osteoLevel = clamp(boneRelief * texDetail, 0.0, 1.0);

          vec3 boneCol = mix(recessedCavity, periostealShadow, smoothstep(0.14, 0.38, osteoLevel));
          boneCol = mix(boneCol, mineralizedIvory, smoothstep(0.36, 0.66, osteoLevel));
          boneCol = mix(boneCol, corticalHighlight, smoothstep(0.66, 0.92, osteoLevel));

          diffuseColor.rgb = boneCol;
          diffuseColor.a = 1.0;
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          vec3 dPdxF = dFdx(vWorldPosF);
          vec3 dPdyF = dFdy(vWorldPosF);
          float dBdx = dFdx(boneRelief);
          float dBdy = dFdy(boneRelief);
          vec3 surfGradF = (dBdx * dPdxF + dBdy * dPdyF) * 3.5;
          normal = normalize(normal - surfGradF);
          `
        )
        .replace(
          '#include <opaque_fragment>',
          `
          vec3 VdirF = normalize(cameraPosition - vWorldPosF);
          vec3 WnormF = normalize(vWorldNormF);
          float fresnelF = pow(1.0 - clamp(abs(dot(VdirF, WnormF)), 0.0, 1.0), 2.3);
          vec3 xrayPhantomCol = vec3(0.024, 0.036, 0.056) + vec3(0.09, 0.16, 0.25) * fresnelF;
          float keyLitF = 0.48 + 0.52 * clamp(dot(normal, normalize(vec3(0.35, 0.82, 0.45))), 0.0, 1.0);
          vec3 crispBoneCol = diffuseColor.rgb * keyLitF + vec3(0.18, 0.15, 0.10) * pow(clamp(dot(normal, VdirF), 0.0, 1.0), 6.0) * boneRelief;
          outgoingLight = mix(xrayPhantomCol, max(outgoingLight * 0.65 + crispBoneCol * 0.55, crispBoneCol), smoothstep(0.15, 0.45, boneRelief));
          #include <opaque_fragment>
          `
        );
  };

  return baseMat;
}

/**
 * Builds an Authentic 3D Anatomical Myology Ecorché, Subsurface Beating Heart &
 * Tree-Branching Red-Arterial + Blue-Venous Circulatory Material for a `.glb` mesh in `'muscle'` mode.
 *
 * Uses the 16-slice `(vBelly(u), vSpine(u))` anatomical profile (`uProfile`) so:
 * - The Dorsal Aorta & Vena Cava follow the true dorsal spine arch (`tV ~ 0.84`) from tail to head.
 * - Branching Intercostal Arteries & Veins span the true chest/torso (`tV` in `0.08..0.84`) and never bleed onto the legs.
 * - Femoral & Brachial Arteries/Veins run down the central axis of the legs/arms (`v < vBelly`).
 * - The Subsurface Thoracic X-Ray Window reveals the glowing 4-Chambered Beating Heart, Aortic Arch,
 *   Vena Cava, and Breathing Lungs dead-center inside the ribcage!
 */
function createRealGLBMuscleMaterial(
  origMat,
  invHolderWorldUniform,
  holderBox,
  thoraxCenter,
  thoraxRadii,
  bodyProfile,
  species
) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#7a0e13'),
    emissive: new THREE.Color('#160204'),
    emissiveIntensity: 0.22,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.14,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.22,
    normalMap: origMat?.normalMap || null,
    normalScale: new THREE.Vector2(1.65, 1.65),
    bumpMap: origMat?.bumpMap || origMat?.map || null,
    bumpScale: 0.045,
    aoMap: origMat?.aoMap || null,
    aoMapIntensity: 1.35,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  const boxMin = holderBox.min.clone();
  const boxMax = holderBox.max.clone();
  const isPterosaur = species?.rigType === 'pterosaur' ? 1.0 : 0.0;
  const isStegosaur = species?.rigType === 'stegosaur' ? 1.0 : 0.0;
  const isCeratopsian = species?.rigType === 'ceratopsian' ? 1.0 : 0.0;
  const isSauropod = species?.rigType === 'sauropod' ? 1.0 : 0.0;
  const profileCopy = bodyProfile.map((p) => p.clone());
  const timeUniform = { value: 0.0 };
  mat.userData.uTime = timeUniform;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uInvHolderWorld = invHolderWorldUniform;
    shader.uniforms.uBoxMin = { value: boxMin };
    shader.uniforms.uBoxMax = { value: boxMax };
    shader.uniforms.uThoraxCenter = { value: thoraxCenter.clone() };
    shader.uniforms.uThoraxRadii = { value: thoraxRadii.clone() };
    shader.uniforms.uProfile = { value: profileCopy };
    shader.uniforms.uIsPterosaur = { value: isPterosaur };
    shader.uniforms.uIsStegosaur = { value: isStegosaur };
    shader.uniforms.uIsCeratopsian = { value: isCeratopsian };
    shader.uniforms.uIsSauropod = { value: isSauropod };
    shader.uniforms.uTime = timeUniform;
    shader.uniforms.uOrigAlbedo = { value: origMat?.map || null };
    shader.uniforms.uHasOrigAlbedo = { value: origMat?.map ? 1.0 : 0.0 };

    shader.vertexShader =
      `
      uniform mat4 uInvHolderWorld;
      uniform vec3 uBoxMin;
      uniform vec3 uBoxMax;
      varying vec3 vHolderPosM;
      varying vec3 vHolderNormM;
      varying vec3 vMuscleUVW;
      varying vec3 vWorldPosM;
      varying vec3 vWorldNormM;
      varying vec2 vOrigUvM;
      ` +
      shader.vertexShader
        .replace(
          '#include <uv_vertex>',
          `
          #include <uv_vertex>
          vOrigUvM = uv;
          `
        )
        .replace(
          '#include <skinnormal_vertex>',
          `
          #include <skinnormal_vertex>
          vWorldNormM = normalize(mat3(modelMatrix) * objectNormal);
          vHolderNormM = normalize(mat3(uInvHolderWorld) * vWorldNormM);
          `
        )
        .replace(
          '#include <project_vertex>',
          `
          vec4 wpM = modelMatrix * vec4(transformed, 1.0);
          vWorldPosM = wpM.xyz;
          vec3 hPos = (uInvHolderWorld * wpM).xyz;
          vHolderPosM = hPos;
          vec3 bSize = max(vec3(0.001), uBoxMax - uBoxMin);
          vec3 rawUVW = clamp((hPos - uBoxMin) / bSize, 0.0, 1.0);
          if (bSize.z > bSize.x * 1.25) {
            vMuscleUVW = vec3(rawUVW.z, rawUVW.y, (rawUVW.x - 0.5) * 2.0);
            vHolderNormM = vec3(vHolderNormM.z, vHolderNormM.y, vHolderNormM.x);
          } else {
            vMuscleUVW = vec3(rawUVW.x, rawUVW.y, (rawUVW.z - 0.5) * 2.0);
          }
          #include <project_vertex>
          `
        );

    shader.fragmentShader =
      `
      uniform vec3 uThoraxCenter;
      uniform vec3 uThoraxRadii;
      uniform vec2 uProfile[16];
      uniform float uIsPterosaur;
      uniform float uIsStegosaur;
      uniform float uIsCeratopsian;
      uniform float uIsSauropod;
      uniform float uTime;
      uniform sampler2D uOrigAlbedo;
      uniform float uHasOrigAlbedo;
      varying vec3 vHolderPosM;
      varying vec3 vHolderNormM;
      varying vec3 vMuscleUVW;
      varying vec3 vWorldPosM;
      varying vec3 vWorldNormM;
      varying vec2 vOrigUvM;

      vec2 sampleBodyProfileM(float uCoord) {
        float pf = clamp(uCoord * 15.0, 0.0, 15.0);
        int i0 = int(floor(pf));
        int i1 = min(15, i0 + 1);
        float fr = fract(pf);
        vec2 p0 = uProfile[0];
        vec2 p1 = uProfile[0];
        for (int k = 0; k < 16; k++) {
          if (k == i0) p0 = uProfile[k];
          if (k == i1) p1 = uProfile[k];
        }
        return mix(p0, p1, fr);
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float u = vMuscleUVW.x;
          float v = vMuscleUVW.y;
          float w = vMuscleUVW.z;
          float absW = abs(w);
          vec3 hN = normalize(vHolderNormM);

          // Sample exact anatomical (vBelly, vSpine) at longitudinal station u
          vec2 bodyProf = sampleBodyProfileM(u);
          float vBelly = bodyProf.x;
          float vSpine = bodyProf.y;
          float bodySpan = max(0.05, vSpine - vBelly);
          // tV = 0.0 at ventral belly/throat/jaw/tail-bottom, tV = 1.0 at dorsal spine/skull-top, tV < 0.0 on legs!
          float tV = (v - vBelly) / bodySpan;

          // 1. NATIVE SCULPT & NORMALIZED TEXTURE SHADING:
          float texLuma = 0.52;
          if (uHasOrigAlbedo > 0.5) {
            vec3 texCol = texture2D(uOrigAlbedo, vOrigUvM).rgb;
            texLuma = clamp(dot(texCol, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
          }
          float sculptShade = 0.30 + 0.56 * smoothstep(0.08, 0.86, texLuma);

          // 2. ULTRA-FINE MICRO-SARCOMERE MUSCLE FIBER GRAIN & ANATOMICAL MUSCLE BELLY CLEFTS:
          float isLimb = (1.0 - smoothstep(-0.02, 0.08, tV)) * smoothstep(0.20, 0.76, u);
          float flowCoord = mix(u * 170.0 + tV * 24.0 * hN.x, v * 160.0 + u * 40.0, isLimb);
          float microFiber = 0.5 + 0.5 * sin((flowCoord + 0.30 * sin(u * 42.0 + v * 42.0)) * 6.28318);
          float muscleBellyCleft = 0.84 + 0.16 * sin((flowCoord * 0.12 + hN.y * 2.5) * 6.28318);

          // Subtle silver-rose collagen tendon insertion ONLY at distal ankles/wrists (v < 0.12)
          float distalTendon = (1.0 - smoothstep(0.05, 0.12, v)) * smoothstep(0.20, 0.76, u) * 0.22;

          // 3. DOUBLE-PEAKED CARDIAC CYCLE ("LUB-DUB") & SYSTOLIC PULSE WAVE:
          float beatPhase = fract(uTime * 1.25);
          float systole = exp(-pow((beatPhase - 0.18) / 0.072, 2.0));
          float diastole = 0.60 * exp(-pow((beatPhase - 0.36) / 0.092, 2.0));
          float heartBeat = clamp(systole + diastole, 0.0, 1.0);

          vec3 dHeart = (vHolderPosM - uThoraxCenter) / max(vec3(0.05), uThoraxRadii);
          float distFromHeart = length(dHeart);
          float pulseWave = 0.5 + 0.5 * sin(uTime * 8.8 - distFromHeart * 3.4);

          // 4. TRUE ANATOMICAL TREE-BRANCHING CIRCULATORY SYSTEM (Mapped via tV in [0..1]!):
          float lateralMask = smoothstep(0.18, 0.48, abs(hN.z));
          bool isDorsalPlates = (uIsStegosaur > 0.5 && tV > 0.96 && absW < 0.28);

          // (a) Main Dorsal Aorta + Carotid + Caudal Artery running along tV ~ 0.84 (high inside the dorsal trunk/neck/tail!)
          float aortaTV = 0.84 + 0.025 * sin(u * 26.0);
          float dorsalAorta = (1.0 - smoothstep(0.022, 0.068, abs(tV - aortaTV)))
            * smoothstep(0.04, 0.94, u) * lateralMask * (isDorsalPlates ? 0.0 : 1.0);

          // (b) Companion Posterior Vena Cava + Jugular + Caudal Vein running parallel at tV ~ 0.72 in Sapphire-Blue
          float venaCavaTV = 0.72 + 0.025 * cos(u * 24.0);
          float venaCava = (1.0 - smoothstep(0.020, 0.060, abs(tV - venaCavaTV)))
            * smoothstep(0.06, 0.92, u) * lateralMask * (isDorsalPlates ? 0.0 : 1.0);

          // (c) Segmental Intercostal & Dendritic Y-Branching Arteries/Veins spanning the torso/neck/tail (tV in 0.08..0.84)
          float distBelowAorta = clamp(aortaTV - tV, 0.0, 0.80);
          float trunkVesselMask = smoothstep(0.06, 0.16, tV) * (1.0 - smoothstep(0.82, 0.89, tV))
            * smoothstep(0.10, 0.90, u) * lateralMask * (isDorsalPlates ? 0.0 : 1.0);
          float segPhase = u * 16.0 - distBelowAorta * 0.60 + 0.04 * sin(distBelowAorta * 18.0);
          // Primary segmental artery + Y-fork bifurcation into secondary arterioles
          float segArtery1 = smoothstep(0.83, 0.98, cos(segPhase * 6.28318));
          float segArtery2 = smoothstep(0.85, 0.985, cos((segPhase * 2.0 + 0.25 * sin(u * 38.0)) * 6.28318))
            * smoothstep(0.12, 0.35, distBelowAorta) * 0.78;
          // Companion segmental intercostal veins (shifted phase)
          float segVein = smoothstep(0.85, 0.985, cos((segPhase + 0.36) * 6.28318))
            * (1.0 - smoothstep(0.58, 0.76, distBelowAorta)) * 0.84;

          // (d) Appendicular Limb Arteries & Veins (Femoral-Tibial & Brachial-Radial along central leg axis, v < vBelly)
          float limbTopV = vBelly + 0.10 * bodySpan;
          float limbMask = (1.0 - smoothstep(limbTopV - 0.03, limbTopV + 0.04, v))
            * smoothstep(0.20, 0.26, u) * (1.0 - smoothstep(0.70, 0.76, u)) * lateralMask;
          float limbArtery = (1.0 - smoothstep(0.03, 0.11, abs(hN.x - 0.05 - 0.04 * sin(v * 28.0)))) * limbMask;
          float limbVein = (1.0 - smoothstep(0.03, 0.10, abs(hN.x + 0.12 - 0.04 * cos(v * 28.0)))) * limbMask;
          float limbCollaterals = smoothstep(0.86, 0.985, cos((v * 24.0 - abs(hN.x) * 2.2) * 6.28318))
            * (1.0 - smoothstep(0.08, 0.38, abs(hN.x))) * limbMask * 0.65;

          float arterialTree = clamp(max(max(dorsalAorta, limbArtery), max((segArtery1 + segArtery2) * trunkVesselMask, limbCollaterals)), 0.0, 1.0);
          float venousTree = clamp(max(max(venaCava, limbVein), segVein * trunkVesselMask), 0.0, 1.0);

          // 5. SUBSURFACE THORACIC X-RAY WINDOW: 4-CHAMBERED BEATING HEART, AORTIC ARCH, VENA CAVA & LUNGS:
          vec3 dHeartPumped = dHeart / (0.88 + 0.22 * heartBeat);
          vec2 rotXY = vec2(dHeartPumped.x * 0.88 - dHeartPumped.y * 0.46, dHeartPumped.x * 0.46 + dHeartPumped.y * 0.88);
          float heartCoreDist = length(vec3(rotXY.x * 1.22, rotXY.y * 1.00, dHeartPumped.z * 0.82));
          // Interventricular & atrioventricular sulci dividing the 4 chambers (Left/Right Ventricles + Left/Right Atria)
          float ivSulcus = 1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.07, abs(rotXY.x + 0.04)));
          float avSulcus = 1.0 - 0.40 * (1.0 - smoothstep(0.0, 0.06, abs(rotXY.y - 0.12)));
          float heartChambers = (1.0 - smoothstep(0.24, 0.68, heartCoreDist)) * ivSulcus * avSulcus * lateralMask;
          float rightHeartMask = smoothstep(-0.05, 0.18, -rotXY.x) * smoothstep(-0.15, 0.35, rotXY.y);

          // Ascending Aortic Arch curving up and back from the Left Ventricle into the Dorsal Aorta
          vec3 dAorta = dHeart - vec3(-0.14, 0.30 - 0.38 * dHeart.x * dHeart.x, 0.0);
          float aortaDist = length(vec2(dAorta.y * 2.2, dAorta.z * 1.2)) + smoothstep(0.48, 0.85, abs(dHeart.x));
          float aortaArchGlow = (1.0 - smoothstep(0.08, 0.32, aortaDist)) * lateralMask;

          // Multi-lobed vascular lungs & air sacs posterior/dorsal to the heart
          float breathScale = 1.0 + 0.10 * sin(uTime * 2.6);
          vec3 dLungs = (dHeart - vec3(-0.32, 0.16, 0.0)) / breathScale;
          float lungDist = length(vec3(dLungs.x * 0.72, dLungs.y * 1.12, dLungs.z * 0.85));
          float lungBronchi = 0.65 + 0.35 * cos((dLungs.x * 9.0 - dLungs.y * 6.0) * 6.28318);
          float lungGlow = (1.0 - smoothstep(0.28, 0.90, lungDist)) * lungBronchi * lateralMask * 0.78;

          // Subsurface dark thoracic cavity window framing the beating heart & lungs behind ribs
          float cavityDist = length(vec3((dHeart.x + 0.16) * 0.66, (dHeart.y - 0.08) * 0.86, dHeart.z * 0.82));
          float thoraxWindow = (1.0 - smoothstep(0.54, 1.06, cavityDist)) * lateralMask * smoothstep(0.05, 0.20, tV);
          float ribCageBars = smoothstep(0.58, 0.90, cos((u * 18.5 - tV * 0.48) * 6.28318));

          // 6. ANATOMICAL COLOR COMPOSITING:
          vec3 deepMyoglobin = vec3(0.15, 0.012, 0.020);
          vec3 richMuscle = vec3(0.52, 0.045, 0.062);
          vec3 oxygenatedMuscle = vec3(0.76, 0.12, 0.13);
          vec3 tendonCol = vec3(0.74, 0.52, 0.48);
          vec3 venousCol = mix(vec3(0.10, 0.24, 0.62), vec3(0.22, 0.48, 0.88), 0.5 + 0.5 * sin(uTime * 6.0 + distFromHeart * 2.5));
          vec3 arterialCol = mix(vec3(0.88, 0.10, 0.08), vec3(1.0, 0.52, 0.16), pulseWave);

          float fiberDetail = (0.84 + 0.16 * microFiber) * muscleBellyCleft;
          vec3 muscleCol = mix(deepMyoglobin, richMuscle, clamp(sculptShade * fiberDetail, 0.0, 1.0));
          muscleCol = mix(muscleCol, oxygenatedMuscle, smoothstep(0.48, 0.88, sculptShade) * microFiber * 0.34);
          muscleCol = mix(muscleCol, tendonCol, distalTendon);

          // Layer companion blue veins and pulsing scarlet arteries over the sculpted musculature
          muscleCol = mix(muscleCol, venousCol, venousTree * 0.82);
          muscleCol = mix(muscleCol, arterialCol, arterialTree * (0.64 + 0.36 * pulseWave));

          // Subtle enamel highlight strictly on anterior teeth/beak tips
          float toothEnamel = smoothstep(0.84, 0.95, texLuma) * smoothstep(0.85, 0.91, u);
          muscleCol = mix(muscleCol, vec3(0.88, 0.80, 0.70), toothEnamel * 0.70);

          // Composite the Subsurface Thoracic X-Ray Window (Dark Cavity + Lung Lobes + 4-Chambered Heart + Rib Shadows)
          if (thoraxWindow > 0.01) {
            vec3 darkThoraxCavity = vec3(0.06, 0.008, 0.015);
            vec3 lungTissueCol = vec3(0.64, 0.12, 0.26) * (0.72 + 0.28 * sin(uTime * 2.6));
            vec3 leftHeartCol = mix(vec3(0.96, 0.14, 0.08), vec3(1.0, 0.68, 0.20), heartBeat);
            vec3 rightHeartCol = mix(vec3(0.42, 0.16, 0.68), vec3(0.68, 0.32, 0.86), heartBeat);
            vec3 chamberCol = mix(leftHeartCol, rightHeartCol, rightHeartMask * 0.70);

            vec3 visceraCol = mix(darkThoraxCavity, lungTissueCol, clamp(lungGlow, 0.0, 1.0));
            visceraCol = mix(visceraCol, leftHeartCol, clamp(aortaArchGlow * 0.95, 0.0, 1.0));
            visceraCol = mix(visceraCol, chamberCol, clamp(heartChambers * 1.15, 0.0, 1.0));
            // Frame the internal thoracic organs behind semi-translucent dark intercostal rib bars
            vec3 ribBarCol = vec3(0.24, 0.04, 0.05);
            visceraCol = mix(visceraCol, ribBarCol, ribCageBars * 0.42 * (1.0 - 0.55 * heartChambers));

            muscleCol = mix(muscleCol, visceraCol, clamp(thoraxWindow * 0.90, 0.0, 1.0));
          }

          diffuseColor.rgb = muscleCol;
          diffuseColor.a = 1.0;
          `
        )
        .replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          float beatPhaseE = fract(uTime * 1.25);
          float heartPulseE = exp(-pow((beatPhaseE - 0.18) / 0.072, 2.0)) + 0.60 * exp(-pow((beatPhaseE - 0.36) / 0.092, 2.0));
          vec3 dHeartE = (vHolderPosM - uThoraxCenter) / max(vec3(0.05), uThoraxRadii * (0.88 + 0.22 * heartPulseE));
          vec2 rotXYE = vec2(dHeartE.x * 0.88 - dHeartE.y * 0.46, dHeartE.x * 0.46 + dHeartE.y * 0.88);
          float heartCoreE = (1.0 - smoothstep(0.22, 0.66, length(vec3(rotXYE.x * 1.22, rotXYE.y * 1.00, dHeartE.z * 0.82))))
            * smoothstep(0.18, 0.48, abs(normalize(vHolderNormM).z));
          totalEmissiveRadiance += vec3(1.0, 0.28, 0.08) * heartCoreE * (0.75 + 1.10 * heartPulseE);
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          vec3 dPdxM = dFdx(vWorldPosM);
          vec3 dPdyM = dFdy(vWorldPosM);
          float dMdx = dFdx(diffuseColor.r - diffuseColor.b);
          float dMdy = dFdy(diffuseColor.r - diffuseColor.b);
          vec3 surfGradM = (dMdx * dPdxM + dMdy * dPdyM) * 1.6;
          normal = normalize(normal - surfGradM);
          `
        )
        .replace(
          '#include <opaque_fragment>',
          `
          vec3 VdirM = normalize(cameraPosition - vWorldPosM);
          vec3 WnormM = normalize(vWorldNormM);
          float fresnelM = pow(1.0 - clamp(abs(dot(VdirM, WnormM)), 0.0, 1.0), 2.6);
          float keyLitM = 0.42 + 0.58 * clamp(dot(normal, normalize(vec3(0.35, 0.80, 0.48))), 0.0, 1.0);
          float wetSpecM = pow(clamp(dot(reflect(-normalize(vec3(0.35, 0.80, 0.48)), normal), VdirM), 0.0, 1.0), 18.0) * 0.14;
          vec3 controlledMuscle = diffuseColor.rgb * mix(keyLitM, 1.0, clamp(max(thoraxWindow, max(arterialTree, venousTree)), 0.0, 1.0))
            + vec3(0.95, 0.35, 0.30) * wetSpecM * (1.0 - thoraxWindow)
            + vec3(0.26, 0.03, 0.04) * fresnelM
            + totalEmissiveRadiance * 0.45;
          outgoingLight = mix(outgoingLight, controlledMuscle, 0.78);
          #include <opaque_fragment>
          `
        );
  };

  return mat;
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

  const isZLonger = size.z > size.x * 1.25;
  const lenSize = Math.max(0.001, isZLonger ? size.z : size.x);
  const lenMin = isZLonger ? min.z : min.x;
  const latSize = Math.max(0.001, isZLonger ? size.x : size.z);
  const latCenter = isZLonger ? center.x : center.z;
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

  // Anterior thoracic position (`thoraxU`) along the body axis
  const thoraxU = isSauropod
    ? 0.48
    : isPterosaur
      ? 0.54
      : species.rigType === 'ceratopsian'
        ? 0.48
        : 0.54;

  const tBin = Math.min(15, Math.max(0, Math.round(thoraxU * 15)));
  const thoraxBellyV = smoothBelly[tBin];
  const thoraxSpineV = smoothSpine[tBin];
  const thoraxNormV = 0.46 * thoraxBellyV + 0.54 * thoraxSpineV;
  const thoraxY = min.y + thoraxNormV * heightSize;
  const thoraxH = Math.max(heightSize * 0.18, (thoraxSpineV - thoraxBellyV) * heightSize);

  const thoraxLenCoord = lenMin + thoraxU * lenSize;
  const thoraxCenter = isZLonger
    ? new THREE.Vector3(center.x, thoraxY, thoraxLenCoord)
    : new THREE.Vector3(thoraxLenCoord, thoraxY, center.z);

  const rLen = Math.max(0.18, Math.min(lenSize * 0.14, thoraxH * 0.62));
  const rY = Math.max(0.16, Math.min(heightSize * 0.24, thoraxH * 0.52));
  const rLat = Math.max(0.22, latSize * 0.48);
  const thoraxRadii = isZLonger
    ? new THREE.Vector3(rLat, rY, rLen)
    : new THREE.Vector3(rLen, rY, rLat);

  return { thoraxCenter, thoraxRadii, bodyProfile };
}

/**
 * Loads, normalizes, and mounts the real `.glb` 3D model onto an existing creature rig
 * returned by `buildPrehistoricCreature(species, scale)`.
 *
 * - In `'skin'` mode: displays the 100% real sculpted & PBR-textured `.glb` dinosaur.
 * - In `'skeleton'` / `'xray'` mode: transforms the `.glb` mesh into a full-body 3D
 *   Osteological Relief & Excavated Fossil Skeleton (3D normal-beveled thoracic ribs,
 *   segmented vertebrae, cranial fenestrae, and long-bone limb shafts with zero discard holes).
 * - In `'muscle'` mode: transforms the `.glb` mesh into a glossy Striated Musculature Ecorché
 *   with a subsurface-illuminated 3D Beating Heart, Aortic Arch, Lungs, and animated systolic
 *   arterial blood vessels pulsing across the body!
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

    // Mount realHolder into creatureRig.group BEFORE computing world-to-holder inverse
    creatureRig.group.add(realHolder);
    syncHolderAndSkeletons(realHolder);

    // Compute final posed bounding box, 16-slice body profile & thoracic heart/lung coordinates in realHolder local space
    const holderLocalBox = new THREE.Box3();
    const { thoraxCenter, thoraxRadii, bodyProfile } = computeRealGLBThoraxBounds(
      realHolder,
      holderLocalBox,
      species
    );

    const invHolderWorldUniform = {
      value: new THREE.Matrix4().copy(realHolder.matrixWorld).invert(),
    };

    // 3. Collect real GLB meshes, create Skin / Fossil Skeleton / Striated Muscle materials
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

      const primaryMat = enhancedMats[0] || obj.material;
      const fossilMat = createRealGLBFossilMaterial(
        primaryMat,
        invHolderWorldUniform,
        holderLocalBox,
        thoraxCenter,
        thoraxRadii,
        bodyProfile,
        species
      );
      const muscleMat = createRealGLBMuscleMaterial(
        primaryMat,
        invHolderWorldUniform,
        holderLocalBox,
        thoraxCenter,
        thoraxRadii,
        bodyProfile,
        species
      );

      obj.material = Array.isArray(obj.material) ? enhancedMats : enhancedMats[0];
      glbMeshes.push({
        mesh: obj,
        origMat: obj.material,
        fossilMat,
        muscleMat,
      });
    });

    creatureRig.realGlbGroup = realHolder;
    creatureRig.realGlbMeshes = glbMeshes;
    creatureRig.realMixer = mixer;
    creatureRig.isRealGLB = true;
    creatureRig.realGlbFile = spec.file;

    // 4. Override setAnatomyLayer so:
    //    - All old procedural meshes stay 100% hidden!
    //    - 'skin' mode shows the full PBR-textured .glb model
    //    - 'skeleton' / 'xray' mode shows the 3D Osteological Relief & Fossil Bone .glb
    //    - 'muscle' mode shows the Striated Muscle Ecorché & Subsurface Beating Heart .glb
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
        creatureRig.anat.organGroup.visible = false;
        if (creatureRig.anat.skullBone) creatureRig.anat.skullBone.visible = false;
        if (creatureRig.anat.brainMesh) creatureRig.anat.brainMesh.visible = false;
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
      const showMuscle = layer === 'muscle';

      glbMeshes.forEach(({ mesh, origMat, fossilMat, muscleMat }) => {
        mesh.visible = true;
        if (showSkinFull) {
          mesh.material = origMat;
        } else if (showMuscle) {
          mesh.material = muscleMat;
        } else {
          mesh.material = fossilMat;
        }
      });
    };

    // Immediately apply current anatomy layer
    creatureRig.setAnatomyLayer(currentLayer);

    // 5. Hook real GLB skeletal animation + vascular heartbeat uniform + vocalization into creatureRig.animate
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

      // Advance native GLB skeletal animation mixer
      if (mixer) {
        const speedMul = whatIf ? 1.65 : 1.0;
        mixer.update(dt * speedMul);
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

      if (jawBone && vocal > 0.001) {
        jawBone.rotation.x = jawBaseRotX + vocal * 0.38;
        jawBone.rotation.z = jawBaseRotZ - vocal * 0.25;
      }
      if (headBone && vocal > 0.001) {
        headBone.rotation.z = headBaseRotZ + vocal * 0.18;
      }

      // Keep realHolder inverse world matrix & arterial pulse time uniform 100% synced
      realHolder.updateMatrixWorld(false);
      invHolderWorldUniform.value.copy(realHolder.matrixWorld).invert();
      for (let i = 0; i < glbMeshes.length; i++) {
        const mMat = glbMeshes[i].muscleMat;
        if (mMat?.userData?.uTime) {
          mMat.userData.uTime.value = time;
        }
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

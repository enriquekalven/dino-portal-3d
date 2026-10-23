import * as THREE from '../../vendor/three/build/three.module.js';

/**
 * SmithsonianFossilSkeleton.js
 *
 * Authentic Natural History Museum & Smithsonian NMNH ("Deep Time" Hall / Museum für Naturkunde Berlin)
 * 1-to-1 Fitted 3D Fossil Skeleton System for DinoVerse 3D:
 *
 * 1. Real 3D Museum Laser-Scan & Articulated Skeleton `.glb` Mounts:
 *    - `smithsonian-triceratops.glb`: Official Smithsonian Institution NMNH "Hatcher" (USNM 4928)
 *      102,071-vertex 3D laser scan for *Triceratops* (aligned 1-to-1 in pitch & scale with `triceratops.glb`).
 *    - `trex-skeleton-rigged.glb`: Full 29,435-vertex 3D articulated tyrannosaurid skeleton mount
 *      (individual curved ribs, gastralia, vertebrae, neural spines, chevrons, tri-radiate pelvis
 *      with pubic boot, scapula, 2-finger forelimbs, femur, separated tibia + fibula, metatarsals,
 *      phalanges, and fenestrated skull) surfaced in Smithsonian Hell Creek permineralized amber-ochre-umber bone.
 *
 * 2. 1-to-1 Mesh- & Bone-Extracted 3D Open-Air Articulated Museum Fossil Skeleton Builder (`buildSmithsonianFossilSkeletonForGLB`):
 *    - Directly extracts the exact 24-slice posed vertex envelope, medial body/neck/tail curve,
 *      ground-contact foot/hand stations, lateral flipper/wing peaks, and head/snout pose from `realHolder`
 *      so toggling between `🦖 Skin & Feathers` and `🦴 Fossil Skeleton` aligns 1-to-1 across every species!
 *    - Features 100% open air between curved 3D thoracic ribs, beneath the spine, through 3D skull
 *      fenestrae, and between separated paired `tibia + fibula` and `radius + ulna` shafts, supported
 *      by dark gunmetal museum steel armature rods.
 */

const sharedMatCache = new Map();

/**
 * Creates the signature Smithsonian NMNH / Morrison & Hell Creek Formation
 * Permineralized Fossil Bone PBR Material (`#d2ab74` cortical ochre -> `#9c6e3b` phosphate amber ->
 * `#462b14` deep mineral matrix in sutures, pleurocoels & nutrient foramina).
 */
export function createSmithsonianBonePBRMaterial(variant = 'ochre') {
  if (sharedMatCache.has(variant)) {
    return sharedMatCache.get(variant);
  }

  const isIvory = variant === 'ivory';
  const isDarkMatrix = variant === 'matrix';

  const baseColor = isDarkMatrix
    ? '#6e4c28'
    : isIvory
      ? '#d8c39e'
      : '#c89d66';

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    roughness: isDarkMatrix ? 0.76 : 0.58,
    metalness: 0.04,
    clearcoat: 0.08,
    clearcoatRoughness: 0.52,
    envMapIntensity: 0.38,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `
      varying vec3 vBoneLocalPos;
      varying vec3 vBoneWorldPos;
      varying vec3 vBoneWorldNorm;
      ` +
      shader.vertexShader
        .replace(
          '#include <skinnormal_vertex>',
          `
          #include <skinnormal_vertex>
          vBoneWorldNorm = normalize(mat3(modelMatrix) * objectNormal);
          `
        )
        .replace(
          '#include <project_vertex>',
          `
          vBoneLocalPos = position;
          vec4 wpBone = modelMatrix * vec4(transformed, 1.0);
          vBoneWorldPos = wpBone.xyz;
          #include <project_vertex>
          `
        );

    shader.fragmentShader =
      `
      varying vec3 vBoneLocalPos;
      varying vec3 vBoneWorldPos;
      varying vec3 vBoneWorldNorm;
      ` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          vec3 pW = vBoneWorldPos * 3.8;
          vec3 pL = vBoneLocalPos * 6.0;
          vec3 wN = normalize(vBoneWorldNorm);

          // Multi-scale periosteal longitudinal striations & Haversian canal micro-grain
          float grain1 = 0.5 + 0.5 * sin(pW.x * 19.0 + pW.y * 11.0 + 1.8 * sin(pW.z * 9.0));
          float grain2 = 0.5 + 0.5 * cos(pW.y * 37.0 - pW.z * 23.0 + 1.4 * cos(pW.x * 17.0));
          float pores = 0.5 + 0.5 * sin(pL.x * 53.0 + pL.y * 47.0 + pL.z * 41.0);
          float pat = 0.55 * grain1 + 0.30 * grain2 + 0.15 * pores;

          // Upward dorsal ridges catch warm sandstone-ivory highlights; undersides & sutures collect dark umber mineral
          float upMask = 0.5 + 0.5 * clamp(wN.y * 0.78 + wN.x * 0.22, -1.0, 1.0);
          float boneLevel = clamp(pat * 0.62 + upMask * 0.38, 0.0, 1.0);

          vec3 deepUmber = ${isIvory ? 'vec3(0.20, 0.12, 0.06)' : 'vec3(0.16, 0.09, 0.04)'};
          vec3 midOchre = ${isIvory ? 'vec3(0.54, 0.39, 0.23)' : 'vec3(0.46, 0.29, 0.14)'};
          vec3 warmCortical = ${isIvory ? 'vec3(0.80, 0.68, 0.49)' : 'vec3(0.74, 0.54, 0.32)'};
          vec3 ridgeHighlight = ${isIvory ? 'vec3(0.93, 0.85, 0.68)' : 'vec3(0.89, 0.73, 0.48)'};

          vec3 fossilCol = mix(deepUmber, midOchre, smoothstep(0.10, 0.44, boneLevel));
          fossilCol = mix(fossilCol, warmCortical, smoothstep(0.42, 0.74, boneLevel));
          fossilCol = mix(fossilCol, ridgeHighlight, smoothstep(0.74, 0.96, boneLevel));

          diffuseColor.rgb = fossilCol;
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          vec3 dPxB = dFdx(vBoneWorldPos);
          vec3 dPyB = dFdy(vBoneWorldPos);
          float lumaB = dot(diffuseColor.rgb, vec3(0.333));
          vec3 gradB = (dFdx(lumaB) * dPxB + dFdy(lumaB) * dPyB) * 2.25;
          normal = normalize(normal - gradB);
          `
        )
        .replace(
          '#include <opaque_fragment>',
          `
          vec3 Vb = normalize(cameraPosition - vBoneWorldPos);
          vec3 Lkey = normalize(vec3(0.42, 0.84, 0.46));
          vec3 Lfill = normalize(vec3(-0.55, 0.28, -0.45));
          float nDotL = clamp(dot(normal, Lkey), 0.0, 1.0);
          float nDotFill = clamp(dot(normal, Lfill), 0.0, 1.0);
          float facing = clamp(abs(dot(Vb, normalize(vBoneWorldNorm))), 0.0, 1.0);
          float edgeShadow = mix(0.46, 1.0, pow(facing, 0.55));
          float rimB = pow(1.0 - facing, 2.8);
          float specB = pow(clamp(dot(reflect(-Lkey, normal), Vb), 0.0, 1.0), 26.0) * 0.18;
          vec3 museumLit = diffuseColor.rgb * edgeShadow * (0.18 + 0.68 * pow(nDotL, 1.18) + 0.14 * nDotFill)
            + vec3(0.88, 0.74, 0.52) * specB
            + vec3(0.16, 0.10, 0.04) * rimB;
          outgoingLight = mix(outgoingLight, museumLit, 0.88);
          #include <opaque_fragment>
          `
        );
  };

  sharedMatCache.set(variant, mat);
  return mat;
}

/**
 * Dark gunmetal steel material for Smithsonian / Museum armature support rods & brackets.
 */
export function createMuseumArmatureMaterial() {
  if (sharedMatCache.has('armature')) {
    return sharedMatCache.get('armature');
  }
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1c2026'),
    roughness: 0.34,
    metalness: 0.84,
  });
  sharedMatCache.set('armature', mat);
  return mat;
}

/**
 * Builds a vertical dark-steel museum armature rod from `groundY` up to `targetPt` with a U-cradle bracket.
 */
function buildArmatureSupportRod(groundY, targetPt, radius = 0.018, mat = createMuseumArmatureMaterial()) {
  const group = new THREE.Group();
  const h = Math.max(0.05, targetPt.y - groundY);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, h, 10), mat);
  rod.position.set(targetPt.x, groundY + h * 0.5, targetPt.z);
  rod.castShadow = true;
  group.add(rod);

  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 3.4, radius * 3.8, radius * 0.9, 12),
    mat
  );
  basePlate.position.set(targetPt.x, groundY + radius * 0.45, targetPt.z);
  group.add(basePlate);

  const bracket = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 2.6, radius * 0.65, 8, 14, Math.PI),
    mat
  );
  bracket.rotation.z = Math.PI;
  bracket.rotation.y = Math.PI / 2;
  bracket.position.copy(targetPt);
  group.add(bracket);

  return group;
}

/**
 * Builds a realistic 3D sculpted osteological bone between `pStart` and `pEnd`
 * with flared bilobed proximal & distal articular condyles (`epiphyses`), an intercondylar groove,
 * a slender waisted diaphysis shaft with cortical ridge, and natural curvature (`bowForward`, `bowLateral`).
 */
export function buildSculptedBoneBetween(
  pStart,
  pEnd,
  radiusMid,
  material,
  {
    proxFlare = 1.65,
    distFlare = 1.6,
    bowForward = 0.0,
    bowLateral = 0.0,
    flattenZ = 1.0,
    radialSegs = 12,
    heightSegs = 14,
  } = {}
) {
  const dir = new THREE.Vector3().subVectors(pEnd, pStart);
  const len = dir.length();
  if (len < 0.0005) return new THREE.Group();

  const geo = new THREE.BufferGeometry();
  const vertices = [];
  const normals = [];
  const indices = [];

  const axisY = dir.clone().normalize();
  const refUp = Math.abs(axisY.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const axisX = new THREE.Vector3().crossVectors(axisY, refUp).normalize();
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();

  for (let i = 0; i <= heightSegs; i++) {
    const t = i / heightSegs;
    const sinBow = Math.sin(t * Math.PI);

    const proxBell = Math.exp(-Math.pow(t / 0.16, 2.0)) * (proxFlare - 1.0);
    const distBell = Math.exp(-Math.pow((1.0 - t) / 0.16, 2.0)) * (distFlare - 1.0);
    const endCap = Math.sin(Math.min(1.0, Math.min(t, 1.0 - t) / 0.045) * (Math.PI / 2));
    const baseR = radiusMid * (0.86 + 0.14 * Math.sin(t * Math.PI) + proxBell + distBell) * (0.28 + 0.72 * endCap);

    const cx = pStart.x + dir.x * t + (axisX.x * bowForward + axisZ.x * bowLateral) * sinBow * len;
    const cy = pStart.y + dir.y * t + (axisX.y * bowForward + axisZ.y * bowLateral) * sinBow * len;
    const cz = pStart.z + dir.z * t + (axisX.z * bowForward + axisZ.z * bowLateral) * sinBow * len;

    const condyleEndWeight = Math.max(
      Math.exp(-Math.pow(t / 0.14, 2.0)),
      Math.exp(-Math.pow((1.0 - t) / 0.14, 2.0))
    );

    for (let j = 0; j <= radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const bilobed = 1.0 + 0.22 * condyleEndWeight * Math.cos(2.0 * theta);
      const shaftCrest = 1.0 + 0.12 * (1.0 - condyleEndWeight) * Math.cos(3.0 * theta);
      const rx = baseR * bilobed * shaftCrest;
      const rz = baseR * flattenZ * bilobed;

      const lx = rx * cosT;
      const lz = rz * sinT;

      vertices.push(
        cx + lx * axisX.x + lz * axisZ.x,
        cy + lx * axisX.y + lz * axisZ.y,
        cz + lx * axisX.z + lz * axisZ.z
      );

      const nx = cosT * axisX.x + sinT * axisZ.x;
      const ny = cosT * axisX.y + sinT * axisZ.y;
      const nz = cosT * axisX.z + sinT * axisZ.z;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / nLen, ny / nLen, nz / nLen);
    }
  }

  const stride = radialSegs + 1;
  for (let i = 0; i < heightSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
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
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds an articulated 3D osteological vertebra at `pos` oriented along `tangent`:
 * - Waisted amphicoelous spool centrum with recessed dark lateral pleurocoel fossa
 * - Neural arch + transverse processes (diapophyses)
 * - Dorsal neural spine (with angle & height tailored to cervical / dorsal / sacral / caudal station)
 * - Optional ventral V-shaped haemal chevron (for caudal tail vertebrae)
 * - Optional overlapping cervical ribs (for sauropod/theropod necks)
 */
function buildVertebraAssembly(
  pos,
  tangent,
  centrumRadius,
  centrumLen,
  boneMat,
  darkMat,
  {
    spineHeight = 0.12,
    spineTiltBack = 0.28,
    spineWidth = 0.04,
    transverseSpan = 0.09,
    chevronLen = 0.0,
    cervicalRibLen = 0.0,
    bifurcatedSpine = false,
  } = {}
) {
  const g = new THREE.Group();
  g.position.copy(pos);

  const pitch = Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z) || 1);
  const yaw = Math.atan2(-tangent.z, tangent.x || 1);
  g.rotation.order = 'YZX';
  g.rotation.y = yaw;
  g.rotation.z = pitch;

  const pBack = new THREE.Vector3(-centrumLen * 0.46, 0, 0);
  const pFront = new THREE.Vector3(centrumLen * 0.46, 0, 0);
  const spool = buildSculptedBoneBetween(pBack, pFront, centrumRadius, boneMat, {
    proxFlare: 1.38,
    distFlare: 1.38,
    flattenZ: 0.92,
    radialSegs: 10,
    heightSegs: 8,
  });
  g.add(spool);

  if (centrumRadius > 0.022) {
    const fossaGeo = new THREE.CapsuleGeometry(
      centrumRadius * 0.34,
      Math.max(0.01, centrumLen * 0.32),
      4,
      8
    );
    fossaGeo.rotateZ(Math.PI / 2);
    [-1, 1].forEach((side) => {
      const fossa = new THREE.Mesh(fossaGeo, darkMat);
      fossa.scale.set(1.0, 0.65, 0.35);
      fossa.position.set(0, centrumRadius * 0.08, side * centrumRadius * 0.76);
      g.add(fossa);
    });
  }

  if (transverseSpan > 0.01) {
    const pLeft = new THREE.Vector3(0, centrumRadius * 0.68, -transverseSpan);
    const pRight = new THREE.Vector3(0, centrumRadius * 0.68, transverseSpan);
    const transBar = buildSculptedBoneBetween(pLeft, pRight, centrumRadius * 0.34, boneMat, {
      proxFlare: 1.25,
      distFlare: 1.25,
      radialSegs: 8,
      heightSegs: 6,
    });
    g.add(transBar);
  }

  // Keep dorsal neural spines roughly vertical in world space even when the neck rises steeply
  const localWorldUpAngle = -pitch + spineTiltBack;
  if (spineHeight > 0.01) {
    const basePt = new THREE.Vector3(0, centrumRadius * 0.62, 0);
    if (bifurcatedSpine) {
      [-1, 1].forEach((side) => {
        const tipPt = new THREE.Vector3(
          -spineHeight * Math.sin(localWorldUpAngle),
          centrumRadius * 0.62 + spineHeight * Math.cos(localWorldUpAngle),
          side * centrumRadius * 0.65
        );
        const spineMesh = buildSculptedBoneBetween(basePt, tipPt, spineWidth * 0.42, boneMat, {
          proxFlare: 1.3,
          distFlare: 1.2,
          flattenZ: 0.55,
          radialSegs: 8,
          heightSegs: 6,
        });
        g.add(spineMesh);
      });
    } else {
      const tipPt = new THREE.Vector3(
        -spineHeight * Math.sin(localWorldUpAngle),
        centrumRadius * 0.62 + spineHeight * Math.cos(localWorldUpAngle),
        0
      );
      const spineMesh = buildSculptedBoneBetween(basePt, tipPt, spineWidth * 0.52, boneMat, {
        proxFlare: 1.35,
        distFlare: 1.28,
        flattenZ: 0.42,
        radialSegs: 8,
        heightSegs: 7,
      });
      g.add(spineMesh);
    }
  }

  if (chevronLen > 0.01) {
    const chevBase = new THREE.Vector3(-centrumLen * 0.2, -centrumRadius * 0.65, 0);
    const chevTip = new THREE.Vector3(
      -centrumLen * 0.2 - chevronLen * 0.58,
      -centrumRadius * 0.65 - chevronLen * 0.82,
      0
    );
    const chev = buildSculptedBoneBetween(chevBase, chevTip, centrumRadius * 0.28, boneMat, {
      proxFlare: 1.4,
      distFlare: 0.85,
      flattenZ: 0.6,
      radialSegs: 7,
      heightSegs: 5,
    });
    g.add(chev);
  }

  if (cervicalRibLen > 0.01) {
    [-1, 1].forEach((side) => {
      const cStart = new THREE.Vector3(centrumLen * 0.15, -centrumRadius * 0.35, side * centrumRadius * 0.72);
      const cEnd = new THREE.Vector3(
        -cervicalRibLen,
        -centrumRadius * 0.75,
        side * centrumRadius * 0.92
      );
      const cRib = buildSculptedBoneBetween(cStart, cEnd, centrumRadius * 0.18, boneMat, {
        proxFlare: 1.4,
        distFlare: 0.45,
        radialSegs: 6,
        heightSegs: 5,
      });
      g.add(cRib);
    });
  }

  return g;
}

/**
 * Builds a pair of curved 3D double-headed thoracic ribs (left & right costae)
 * with capitulum + tuberculum vertebral heads and open intercostal space.
 */
function buildCurvedThoracicRibPair(
  spinePt,
  halfWidth,
  ribDrop,
  sweepBack,
  ribRadius,
  boneMat,
  withGastralia = false
) {
  const group = new THREE.Group();

  [-1, 1].forEach((side) => {
    const p0 = new THREE.Vector3(spinePt.x, spinePt.y - ribRadius * 0.8, spinePt.z + side * ribRadius * 1.4);
    const p1 = new THREE.Vector3(
      spinePt.x - sweepBack * 0.22,
      spinePt.y - ribDrop * 0.18,
      spinePt.z + side * halfWidth * 0.72
    );
    const p2 = new THREE.Vector3(
      spinePt.x - sweepBack * 0.68,
      spinePt.y - ribDrop * 0.58,
      spinePt.z + side * halfWidth * 0.98
    );
    const p3 = new THREE.Vector3(
      spinePt.x - sweepBack * 0.95,
      spinePt.y - ribDrop * 0.96,
      spinePt.z + side * halfWidth * 0.46
    );

    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    const tubeGeo = new THREE.TubeGeometry(curve, 16, ribRadius, 8, false);

    const pos = tubeGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const ringIdx = Math.floor(i / 9);
      const u = ringIdx / 16;
      const centerPt = curve.getPointAt(u);
      v.fromBufferAttribute(pos, i).sub(centerPt);
      const taper = 1.0 - 0.42 * Math.pow(u, 1.6);
      v.x *= 0.78 * taper;
      v.y *= 1.12 * taper;
      v.z *= 0.95 * taper;
      v.add(centerPt);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    tubeGeo.computeVertexNormals();

    const ribMesh = new THREE.Mesh(tubeGeo, boneMat);
    ribMesh.castShadow = true;
    ribMesh.receiveShadow = true;
    group.add(ribMesh);

    const tubStart = new THREE.Vector3(spinePt.x, spinePt.y + ribRadius * 0.9, spinePt.z + side * ribRadius * 2.2);
    const tubStrut = buildSculptedBoneBetween(tubStart, p1, ribRadius * 0.72, boneMat, {
      proxFlare: 1.3,
      distFlare: 1.1,
      radialSegs: 6,
      heightSegs: 4,
    });
    group.add(tubStrut);

    if (withGastralia) {
      const gasMid = new THREE.Vector3(
        p3.x + sweepBack * 0.28,
        p3.y - ribDrop * 0.07,
        spinePt.z + side * halfWidth * 0.08
      );
      const gasRib = buildSculptedBoneBetween(p3, gasMid, ribRadius * 0.58, boneMat, {
        proxFlare: 1.1,
        distFlare: 0.75,
        radialSegs: 6,
        heightSegs: 5,
      });
      group.add(gasRib);
    }
  });

  return group;
}

/**
 * Builds a 3D dinosaur Pelvic Girdle (Ilium blade with open perforated Acetabulum socket,
 * Pubis shaft/prepubis, and Ischium rod) at `hipPt`.
 */
function buildSculptedPelvicGirdle(hipPt, length, height, halfWidth, boneMat, rigType) {
  const g = new THREE.Group();
  const isOrnithischian =
    rigType === 'stegosaur' ||
    rigType === 'ankylosaur' ||
    rigType === 'hadrosaur' ||
    rigType === 'ceratopsian';

  [-1, 1].forEach((side) => {
    const zLat = hipPt.z + side * halfWidth;

    const iliumBack = new THREE.Vector3(hipPt.x - length * 0.48, hipPt.y - height * 0.06, hipPt.z + side * halfWidth * 0.86);
    const iliumMid = new THREE.Vector3(hipPt.x, hipPt.y + height * 0.08, hipPt.z + side * halfWidth * 0.95);
    const iliumFront = new THREE.Vector3(hipPt.x + length * 0.52, hipPt.y - height * 0.08, hipPt.z + side * halfWidth * 1.02);
    const iliumCurve = new THREE.CatmullRomCurve3([iliumBack, iliumMid, iliumFront]);
    const iliumGeo = new THREE.TubeGeometry(iliumCurve, 14, height * 0.18, 10, false);
    const pos = iliumGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const u = Math.floor(i / 11) / 14;
      const cpt = iliumCurve.getPointAt(u);
      v.fromBufferAttribute(pos, i).sub(cpt);
      const arch = Math.sin(u * Math.PI);
      v.y *= 1.45 * (0.65 + 0.55 * arch);
      v.z *= 0.34;
      v.add(cpt);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    iliumGeo.computeVertexNormals();
    const iliumMesh = new THREE.Mesh(iliumGeo, boneMat);
    iliumMesh.castShadow = true;
    g.add(iliumMesh);

    const acetabulumPt = new THREE.Vector3(hipPt.x, hipPt.y - height * 0.24, zLat);
    const acetRing = new THREE.Mesh(
      new THREE.TorusGeometry(height * 0.16, height * 0.055, 8, 16),
      boneMat
    );
    acetRing.position.copy(acetabulumPt);
    g.add(acetRing);

    const ischiumTip = new THREE.Vector3(
      hipPt.x - length * 0.62,
      hipPt.y - height * 0.88,
      hipPt.z + side * halfWidth * 0.38
    );
    const ischium = buildSculptedBoneBetween(acetabulumPt, ischiumTip, height * 0.068, boneMat, {
      proxFlare: 1.5,
      distFlare: 1.25,
      bowForward: -0.06,
      flattenZ: 0.65,
    });
    g.add(ischium);

    if (isOrnithischian) {
      const prepubisTip = new THREE.Vector3(
        hipPt.x + length * 0.56,
        hipPt.y - height * 0.42,
        hipPt.z + side * halfWidth * 0.82
      );
      const prepubis = buildSculptedBoneBetween(acetabulumPt, prepubisTip, height * 0.062, boneMat, {
        proxFlare: 1.4,
        distFlare: 1.35,
        flattenZ: 0.48,
      });
      g.add(prepubis);

      const postpubisTip = new THREE.Vector3(
        hipPt.x - length * 0.58,
        hipPt.y - height * 0.78,
        hipPt.z + side * halfWidth * 0.44
      );
      const postpubis = buildSculptedBoneBetween(acetabulumPt, postpubisTip, height * 0.042, boneMat, {
        proxFlare: 1.2,
        distFlare: 0.9,
      });
      g.add(postpubis);
    } else {
      const pubisTip = new THREE.Vector3(
        hipPt.x + length * 0.34,
        hipPt.y - height * 0.92,
        hipPt.z + side * halfWidth * 0.32
      );
      const pubis = buildSculptedBoneBetween(acetabulumPt, pubisTip, height * 0.072, boneMat, {
        proxFlare: 1.5,
        distFlare: 1.85,
        flattenZ: 0.7,
      });
      g.add(pubis);
    }
  });

  return g;
}

/**
 * Builds a 3D Pectoral Girdle (curved paddle-shaped Scapula blade + rounded Coracoid + Sternal plates).
 */
function buildSculptedPectoralGirdle(shoulderPt, scapLen, halfWidth, boneMat) {
  const g = new THREE.Group();

  [-1, 1].forEach((side) => {
    const zGlenoid = shoulderPt.z + side * halfWidth * 0.92;
    const glenoidPt = new THREE.Vector3(shoulderPt.x, shoulderPt.y, zGlenoid);
    const scapMid = new THREE.Vector3(
      shoulderPt.x - scapLen * 0.38,
      shoulderPt.y + scapLen * 0.44,
      shoulderPt.z + side * halfWidth * 1.02
    );
    const scapTop = new THREE.Vector3(
      shoulderPt.x - scapLen * 0.78,
      shoulderPt.y + scapLen * 0.78,
      shoulderPt.z + side * halfWidth * 0.86
    );

    const scapCurve = new THREE.CatmullRomCurve3([glenoidPt, scapMid, scapTop]);
    const scapGeo = new THREE.TubeGeometry(scapCurve, 12, scapLen * 0.095, 10, false);
    const pos = scapGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const u = Math.floor(i / 11) / 12;
      const cpt = scapCurve.getPointAt(u);
      v.fromBufferAttribute(pos, i).sub(cpt);
      const paddleFlare = 0.85 + 0.75 * Math.pow(u, 1.3);
      v.x *= paddleFlare;
      v.y *= paddleFlare;
      v.z *= 0.28;
      v.add(cpt);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    scapGeo.computeVertexNormals();
    const scapMesh = new THREE.Mesh(scapGeo, boneMat);
    scapMesh.castShadow = true;
    g.add(scapMesh);

    const coracoidPt = new THREE.Vector3(
      shoulderPt.x + scapLen * 0.22,
      shoulderPt.y - scapLen * 0.16,
      shoulderPt.z + side * halfWidth * 0.68
    );
    const coracoid = buildSculptedBoneBetween(glenoidPt, coracoidPt, scapLen * 0.12, boneMat, {
      proxFlare: 1.35,
      distFlare: 1.45,
      flattenZ: 0.38,
    });
    g.add(coracoid);
  });

  return g;
}

/**
 * Builds a complete, museum-articulated 3D Appendicular Limb (Hindlimb or Forelimb):
 * - Single sculpted upper bone (`Femur` or `Humerus`) with femoral head / deltopectoral crest & distal condyles
 * - TWO SEPARATED lower bones (`Tibia + Fibula` or `Radius + Ulna` with olecranon process) with open
 *   interosseous space between them (matching Smithsonian NMNH & Berlin Museum mounts!)
 * - Ankle/Wrist tarsals/carpals, diverging metatarsals/metacarpals, and articulated toe/finger phalanges + ungual claws!
 */
function buildArticulatedLimb(
  topPt,
  footPt,
  limbRadius,
  boneMat,
  {
    isHindlimb = true,
    isDigitigrade = false,
    toeCount = 3,
    hasSickleClaw = false,
    giantScytheClaws = false,
    bowOutward = 0.0,
  } = {}
) {
  const g = new THREE.Group();
  const totalDrop = Math.max(0.15, topPt.y - footPt.y);
  const sideSign = topPt.z >= 0 ? 1 : -1;

  const kneePt = isHindlimb
    ? new THREE.Vector3(
        topPt.x + (footPt.x - topPt.x) * 0.42 + totalDrop * (isDigitigrade ? 0.15 : 0.08),
        topPt.y - totalDrop * 0.46,
        topPt.z + sideSign * bowOutward * totalDrop
      )
    : new THREE.Vector3(
        topPt.x + (footPt.x - topPt.x) * 0.38 - totalDrop * 0.11,
        topPt.y - totalDrop * 0.44,
        topPt.z + sideSign * bowOutward * totalDrop
      );

  const anklePt = isDigitigrade
    ? new THREE.Vector3(
        footPt.x - totalDrop * 0.10,
        footPt.y + totalDrop * 0.22,
        footPt.z
      )
    : new THREE.Vector3(
        footPt.x - totalDrop * 0.04,
        footPt.y + totalDrop * 0.11,
        footPt.z
      );

  // 1. Upper Limb Bone: Femur or Humerus
  const upperBone = buildSculptedBoneBetween(topPt, kneePt, limbRadius, boneMat, {
    proxFlare: 1.78,
    distFlare: 1.72,
    bowForward: isHindlimb ? 0.05 : -0.05,
    flattenZ: 0.88,
  });
  g.add(upperBone);

  if (isHindlimb) {
    const headSocketPt = new THREE.Vector3(topPt.x, topPt.y + limbRadius * 0.4, topPt.z - sideSign * limbRadius * 1.6);
    const femHead = buildSculptedBoneBetween(topPt, headSocketPt, limbRadius * 0.82, boneMat, {
      proxFlare: 1.2,
      distFlare: 1.45,
    });
    g.add(femHead);
  } else {
    const crestPt = new THREE.Vector3(
      topPt.x + (kneePt.x - topPt.x) * 0.35 + limbRadius * 1.35,
      topPt.y + (kneePt.y - topPt.y) * 0.35,
      topPt.z
    );
    const deltoCrest = buildSculptedBoneBetween(topPt, crestPt, limbRadius * 0.62, boneMat, {
      proxFlare: 1.1,
      distFlare: 1.3,
      flattenZ: 0.42,
    });
    g.add(deltoCrest);
  }

  // 2. Twin Separated Lower Limb Bones: Tibia + Fibula (or Radius + Ulna)
  const sepX = limbRadius * 0.72;
  const sepZ = sideSign * limbRadius * 0.48;

  const mainShinStart = new THREE.Vector3(kneePt.x + sepX * 0.65, kneePt.y, kneePt.z - sepZ * 0.35);
  const mainShinEnd = new THREE.Vector3(anklePt.x + sepX * 0.55, anklePt.y, anklePt.z - sepZ * 0.25);
  const tibiaOrRadius = buildSculptedBoneBetween(
    mainShinStart,
    mainShinEnd,
    limbRadius * 0.76,
    boneMat,
    {
      proxFlare: 1.68,
      distFlare: 1.55,
      bowForward: 0.03,
    }
  );
  g.add(tibiaOrRadius);

  const splintStart = new THREE.Vector3(
    kneePt.x - sepX * 0.85,
    kneePt.y + (isHindlimb ? 0 : limbRadius * 0.95),
    kneePt.z + sepZ * 0.75
  );
  const splintEnd = new THREE.Vector3(anklePt.x - sepX * 0.75, anklePt.y, anklePt.z + sepZ * 0.65);
  const fibulaOrUlna = buildSculptedBoneBetween(
    splintStart,
    splintEnd,
    limbRadius * (isHindlimb ? 0.42 : 0.58),
    boneMat,
    {
      proxFlare: 1.55,
      distFlare: 1.45,
      bowForward: -0.03,
    }
  );
  g.add(fibulaOrUlna);

  // 3. Metatarsals / Metacarpals & Articulated Pedal / Manual Phalanges + Ungual Claws
  const toeSpread = limbRadius * (giantScytheClaws ? 2.1 : 1.45);
  const footForward = Math.max(limbRadius * 2.6, totalDrop * 0.16);

  for (let t = 0; t < toeCount; t++) {
    const frac = toeCount === 1 ? 0 : (t / (toeCount - 1) - 0.5) * 2.0;
    const zOff = frac * toeSpread;
    const xLen = footForward * (1.0 - 0.22 * Math.abs(frac));

    const metaStart = new THREE.Vector3(anklePt.x, anklePt.y, anklePt.z + zOff * 0.42);
    const knucklePt = new THREE.Vector3(
      footPt.x + xLen * 0.35,
      footPt.y + limbRadius * 0.32,
      footPt.z + zOff * 0.85
    );
    const metaBone = buildSculptedBoneBetween(metaStart, knucklePt, limbRadius * 0.34, boneMat, {
      proxFlare: 1.35,
      distFlare: 1.35,
    });
    g.add(metaBone);

    if (giantScytheClaws) {
      // Therizinosaurus / Deinocheirus massive curved manual scythe ungual claws!
      const clawLen = totalDrop * (0.48 - 0.06 * Math.abs(frac));
      const cMid = new THREE.Vector3(
        knucklePt.x + clawLen * 0.62,
        knucklePt.y - clawLen * 0.16,
        knucklePt.z + zOff * 0.35
      );
      const cTip = new THREE.Vector3(
        knucklePt.x + clawLen * 0.96,
        knucklePt.y - clawLen * 0.58,
        knucklePt.z + zOff * 0.55
      );
      g.add(
        buildSculptedBoneBetween(knucklePt, cMid, limbRadius * 0.36, boneMat, {
          proxFlare: 1.35,
          distFlare: 0.95,
          flattenZ: 0.48,
        }),
        buildSculptedBoneBetween(cMid, cTip, limbRadius * 0.24, boneMat, {
          proxFlare: 1.15,
          distFlare: 0.18,
          flattenZ: 0.42,
        })
      );
    } else if (hasSickleClaw && t === 0) {
      const sickleMid = new THREE.Vector3(
        knucklePt.x + xLen * 0.28,
        knucklePt.y + limbRadius * 1.45,
        knucklePt.z
      );
      const sickleTip = new THREE.Vector3(
        knucklePt.x + xLen * 0.65,
        knucklePt.y + limbRadius * 0.25,
        knucklePt.z
      );
      const clawCurve = new THREE.CatmullRomCurve3([knucklePt, sickleMid, sickleTip]);
      const clawGeo = new THREE.TubeGeometry(clawCurve, 10, limbRadius * 0.32, 7, false);
      g.add(new THREE.Mesh(clawGeo, boneMat));
    } else {
      const phalMid = new THREE.Vector3(
        knucklePt.x + xLen * 0.38,
        footPt.y + limbRadius * 0.18,
        footPt.z + zOff * 1.05
      );
      const ungualTip = new THREE.Vector3(
        knucklePt.x + xLen * 0.76,
        footPt.y + limbRadius * 0.06,
        footPt.z + zOff * 1.15
      );
      g.add(
        buildSculptedBoneBetween(knucklePt, phalMid, limbRadius * 0.28, boneMat, {
          proxFlare: 1.3,
          distFlare: 1.25,
        }),
        buildSculptedBoneBetween(phalMid, ungualTip, limbRadius * 0.22, boneMat, {
          proxFlare: 1.35,
          distFlare: 0.35,
          flattenZ: 0.75,
        })
      );
    }
  }

  return g;
}

/**
 * Builds an authentic 3D Open-Fenestra Museum Diapsid Fossil Skull (`THREE.Group`)
 * constructed from 3D sculpted cranial bone struts, tooth rows / beaks, and clade-specific
 * horns / crests / frills / domes—with 100% real open space through the Orbit, Antorbital Fenestra,
 * Temporal Fenestrae, External Naris, and Mandibular Fenestra!
 */
function buildMuseumFossilSkull(headBasePt, tangent, skullLen, skullHeight, skullHalfW, species, boneMat) {
  const g = new THREE.Group();
  g.position.copy(headBasePt);

  const pitch = Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z) || 1);
  const yaw = Math.atan2(-tangent.z, tangent.x || 1);
  g.rotation.order = 'YZX';
  g.rotation.y = yaw;
  g.rotation.z = Math.max(-0.55, Math.min(0.55, pitch * 0.52));

  const rig = species?.rigType || 'theropod';
  const id = species?.id || '';
  const isPterosaur = rig === 'pterosaur';
  const isSauropod = rig === 'sauropod';
  const isStego = rig === 'stegosaur';
  const isAnkylo = rig === 'ankylosaur';
  const isHadro = rig === 'hadrosaur';
  const isCeratopsian = rig === 'ceratopsian';
  const isSpinosaur = rig === 'spinosaur' || /spinosaurus|baryonyx|suchomimus/i.test(id);
  const isMarine = species?.domain === 'Ocean';
  const isOrnithomimidOrTheri = /therizinosaurus|gallimimus|oviraptor|gigantoraptor|deinocheirus|gastornis/i.test(id);
  const isBeaked =
    isPterosaur || isStego || isAnkylo || isHadro || isCeratopsian || isOrnithomimidOrTheri;

  const L = Math.max(0.20, skullLen);
  const H = Math.max(0.12, skullHeight);
  const W = Math.max(0.07, skullHalfW * (isSpinosaur ? 0.68 : 1.0));
  const strutR = Math.max(0.010, Math.min(L, H) * 0.082);

  // 1. Central Cranial Braincase & Occipital Condyle (back of skull)
  const occPt = new THREE.Vector3(0, 0, 0);
  const parietalPt = new THREE.Vector3(L * 0.22, H * (isSpinosaur ? 0.34 : 0.42), 0);
  const frontalPt = new THREE.Vector3(L * 0.52, H * (isSpinosaur ? 0.28 : 0.38), 0);
  const nasalPt = new THREE.Vector3(L * 0.84, H * (isSpinosaur ? 0.16 : 0.22), 0);
  const snoutTip = new THREE.Vector3(L, H * (isSpinosaur ? -0.02 : 0.04), 0);

  g.add(
    buildSculptedBoneBetween(occPt, parietalPt, strutR * 1.45, boneMat, { flattenZ: 1.5 }),
    buildSculptedBoneBetween(parietalPt, frontalPt, strutR * 1.35, boneMat, { flattenZ: 1.6 }),
    buildSculptedBoneBetween(frontalPt, nasalPt, strutR * 1.15, boneMat, { flattenZ: 1.3 }),
    buildSculptedBoneBetween(nasalPt, snoutTip, strutR * 0.95, boneMat, { distFlare: 0.75 })
  );

  // 2. Left & Right Lateral Diapsid Skull Arches framing the OPEN Orbit, Antorbital Fenestra & Temporal Fenestra!
  [-1, 1].forEach((side) => {
    const zBack = side * W;
    const zMid = side * W * 0.82;
    const zSnout = side * W * (isHadro ? 0.74 : isSpinosaur ? 0.36 : 0.48);

    const squamosalPt = new THREE.Vector3(L * 0.08, H * 0.36, zBack * 0.92);
    const quadPt = new THREE.Vector3(L * 0.06, -H * 0.18, zBack);
    const postOrbTop = new THREE.Vector3(L * 0.32, H * (isSpinosaur ? 0.32 : 0.38), zMid * 0.95);
    const jugalUnderOrbit = new THREE.Vector3(L * 0.34, -H * 0.12, zMid);
    const lacrimalTop = new THREE.Vector3(L * 0.55, H * (isSpinosaur ? 0.24 : 0.32), zMid * 0.85);
    const maxillaMid = new THREE.Vector3(L * 0.58, -H * 0.10, zMid * 0.88);
    const premaxSide = new THREE.Vector3(L * 0.88, -H * (isSpinosaur ? 0.08 : 0.04), zSnout);

    g.add(
      buildSculptedBoneBetween(parietalPt, squamosalPt, strutR * 0.92, boneMat),
      buildSculptedBoneBetween(squamosalPt, quadPt, strutR * 0.98, boneMat),
      buildSculptedBoneBetween(squamosalPt, postOrbTop, strutR * 0.88, boneMat),
      buildSculptedBoneBetween(quadPt, jugalUnderOrbit, strutR * 0.92, boneMat),
      buildSculptedBoneBetween(postOrbTop, jugalUnderOrbit, strutR * 0.82, boneMat),
      buildSculptedBoneBetween(lacrimalTop, maxillaMid, strutR * 0.82, boneMat),
      buildSculptedBoneBetween(jugalUnderOrbit, maxillaMid, strutR * 0.95, boneMat),
      buildSculptedBoneBetween(maxillaMid, premaxSide, strutR * 0.92, boneMat),
      buildSculptedBoneBetween(premaxSide, snoutTip, strutR * 0.88, boneMat),
      buildSculptedBoneBetween(nasalPt, premaxSide, strutR * 0.72, boneMat)
    );

    if (isSauropod || isPterosaur || isMarine || rig === 'avian' || /velociraptor|deinonychus|utahraptor/i.test(id)) {
      const orbitCenter = new THREE.Vector3(L * 0.43, H * 0.13, zMid * 0.92);
      const sclRing = new THREE.Mesh(
        new THREE.TorusGeometry(H * 0.12, strutR * 0.32, 6, 14),
        boneMat
      );
      sclRing.position.copy(orbitCenter);
      g.add(sclRing);
    }

    // 3. Lower Mandible (Articular + Surangular + Angular + Dentary framing an open Mandibular Fenestra)
    const jawJoint = new THREE.Vector3(L * 0.05, -H * 0.22, zBack * 0.95);
    const surangularTop = new THREE.Vector3(L * 0.36, -H * 0.18, zMid * 0.92);
    const angularBot = new THREE.Vector3(L * 0.36, -H * 0.36, zMid * 0.88);
    const dentaryMid = new THREE.Vector3(L * 0.64, -H * 0.24, zSnout * 0.95);
    const chinTip = new THREE.Vector3(L * 0.96, -H * 0.12, 0);

    g.add(
      buildSculptedBoneBetween(jawJoint, surangularTop, strutR * 0.82, boneMat),
      buildSculptedBoneBetween(jawJoint, angularBot, strutR * 0.82, boneMat),
      buildSculptedBoneBetween(surangularTop, dentaryMid, strutR * 0.85, boneMat),
      buildSculptedBoneBetween(angularBot, dentaryMid, strutR * 0.85, boneMat),
      buildSculptedBoneBetween(dentaryMid, chinTip, strutR * 0.88, boneMat)
    );

    // 4. Maxillary & Dentary Teeth
    if (!isBeaked || /rhamphorhynchus|eudimorphodon|dimorphodon/i.test(id)) {
      const toothCount = isSpinosaur ? 13 : isMarine ? 11 : isSauropod ? 6 : 9;
      for (let t = 0; t < toothCount; t++) {
        const uT = 0.36 + (t / Math.max(1, toothCount - 1)) * 0.56;
        const tx = L * uT;
        const tz = side * W * (0.84 - 0.42 * uT);
        const tyUp = -H * (0.10 - 0.05 * uT);
        const rosetteBoost = isSpinosaur && uT > 0.78 ? 1.45 : 1.0;
        const tLen =
          strutR *
          (isMarine || rig === 'synapsid' || isSpinosaur ? 2.0 : 1.65) *
          rosetteBoost *
          (1.0 - 0.25 * Math.abs(uT - 0.68));

        const toothUp = new THREE.Mesh(
          new THREE.ConeGeometry(strutR * 0.30, tLen, 6),
          boneMat
        );
        toothUp.rotation.z = Math.PI - 0.15;
        toothUp.position.set(tx, tyUp - tLen * 0.45, tz);
        g.add(toothUp);

        const toothLow = new THREE.Mesh(
          new THREE.ConeGeometry(strutR * 0.26, tLen * 0.82, 6),
          boneMat
        );
        toothLow.position.set(tx, tyUp - H * 0.12 + tLen * 0.35, tz * 0.92);
        g.add(toothLow);
      }
    }
  });

  // 5. Clade-Specific Cranial Crests, Frills, Horns, Domes & Armor Bosses
  if (/brachiosaurus|camarasaurus|argentinosaurus/i.test(id)) {
    const crestBase1 = new THREE.Vector3(L * 0.38, H * 0.38, 0);
    const crestPeak = new THREE.Vector3(L * 0.62, H * 0.86, 0);
    const crestBase2 = new THREE.Vector3(L * 0.84, H * 0.24, 0);
    g.add(
      buildSculptedBoneBetween(crestBase1, crestPeak, strutR * 1.15, boneMat, { flattenZ: 0.55 }),
      buildSculptedBoneBetween(crestPeak, crestBase2, strutR * 0.95, boneMat, { flattenZ: 0.55 })
    );
  } else if (isSpinosaur) {
    const sCrest1 = new THREE.Vector3(L * 0.38, H * 0.30, 0);
    const sCrestPeak = new THREE.Vector3(L * 0.54, H * 0.56, 0);
    const sCrest2 = new THREE.Vector3(L * 0.70, H * 0.22, 0);
    g.add(
      buildSculptedBoneBetween(sCrest1, sCrestPeak, strutR * 0.95, boneMat, { flattenZ: 0.35 }),
      buildSculptedBoneBetween(sCrestPeak, sCrest2, strutR * 0.85, boneMat, { flattenZ: 0.35 })
    );
  } else if (/dilophosaurus/i.test(id)) {
    [-1, 1].forEach((side) => {
      const c1 = new THREE.Vector3(L * 0.28, H * 0.36, side * W * 0.38);
      const c2 = new THREE.Vector3(L * 0.56, H * 0.82, side * W * 0.42);
      const c3 = new THREE.Vector3(L * 0.84, H * 0.28, side * W * 0.32);
      g.add(
        buildSculptedBoneBetween(c1, c2, strutR * 1.1, boneMat, { flattenZ: 0.28 }),
        buildSculptedBoneBetween(c2, c3, strutR * 1.0, boneMat, { flattenZ: 0.28 })
      );
    });
  } else if (/cryolophosaurus/i.test(id)) {
    const pompadourL = new THREE.Vector3(L * 0.34, H * 0.78, -W * 0.75);
    const pompadourR = new THREE.Vector3(L * 0.34, H * 0.78, W * 0.75);
    g.add(buildSculptedBoneBetween(pompadourL, pompadourR, strutR * 1.25, boneMat));
  } else if (/carnotaurus/i.test(id)) {
    [-1, 1].forEach((side) => {
      const hBase = new THREE.Vector3(L * 0.32, H * 0.38, side * W * 0.72);
      const hTip = new THREE.Vector3(L * 0.30, H * 0.72, side * W * 1.48);
      g.add(buildSculptedBoneBetween(hBase, hTip, strutR * 1.35, boneMat, { distFlare: 0.25 }));
    });
  } else if (isCeratopsian) {
    [-1, 1].forEach((side) => {
      const fBase = new THREE.Vector3(L * 0.08, H * 0.36, side * W * 0.88);
      const fMid = new THREE.Vector3(-L * 0.38, H * 0.78, side * W * 1.45);
      const fTop = new THREE.Vector3(-L * 0.55, H * 1.05, side * W * 0.28);
      g.add(
        buildSculptedBoneBetween(fBase, fMid, strutR * 1.35, boneMat, { flattenZ: 0.45 }),
        buildSculptedBoneBetween(fMid, fTop, strutR * 1.35, boneMat, { flattenZ: 0.45 })
      );
      if (/styracosaurus/i.test(id)) {
        for (let sp = 0; sp < 3; sp++) {
          const spFrac = (sp + 0.5) / 3;
          const spBase = new THREE.Vector3().lerpVectors(fMid, fTop, spFrac);
          const spTip = new THREE.Vector3(
            spBase.x - L * 0.42,
            spBase.y + H * 0.34,
            spBase.z + side * W * 0.35
          );
          g.add(buildSculptedBoneBetween(spBase, spTip, strutR * 1.05, boneMat, { distFlare: 0.18 }));
        }
      }
    });
    const fCenterTop = new THREE.Vector3(-L * 0.52, H * 1.02, 0);
    g.add(buildSculptedBoneBetween(parietalPt, fCenterTop, strutR * 1.25, boneMat));

    if (/styracosaurus/i.test(id)) {
      const nHornTip = new THREE.Vector3(L * 0.96, H * 0.98, 0);
      g.add(buildSculptedBoneBetween(nasalPt, nHornTip, strutR * 1.55, boneMat, { distFlare: 0.2 }));
    } else if (/pachyrhinosaurus/i.test(id)) {
      const boss = new THREE.Mesh(new THREE.SphereGeometry(strutR * 2.4, 10, 8), boneMat);
      boss.scale.set(1.6, 0.7, 1.2);
      boss.position.set(L * 0.76, H * 0.36, 0);
      g.add(boss);
    }
  } else if (isPterosaur && !/rhamphorhynchus|eudimorphodon|dimorphodon/i.test(id)) {
    const crestTip = new THREE.Vector3(-L * 0.68, H * 0.95, 0);
    g.add(
      buildSculptedBoneBetween(parietalPt, crestTip, strutR * 1.35, boneMat, {
        proxFlare: 1.6,
        distFlare: 0.35,
        flattenZ: 0.32,
      })
    );
  } else if (/parasaurolophus/i.test(id)) {
    const crestMid = new THREE.Vector3(-L * 0.25, H * 0.88, 0);
    const crestTip = new THREE.Vector3(-L * 0.92, H * 1.05, 0);
    const cCurve = new THREE.CatmullRomCurve3([nasalPt, crestMid, crestTip]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cCurve, 12, strutR * 1.35, 8, false), boneMat));
  } else if (/corythosaurus/i.test(id)) {
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.36, L * 0.36, strutR * 1.2, 14), boneMat);
    helm.rotation.x = Math.PI / 2;
    helm.position.set(L * 0.38, H * 0.62, 0);
    g.add(helm);
  } else if (/pachycephalosaurus|stygimoloch/i.test(id)) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(L * 0.34, 14, 12), boneMat);
    dome.scale.set(1.15, 1.05, 0.92);
    dome.position.set(L * 0.34, H * 0.52, 0);
    g.add(dome);
  } else if (isAnkylo) {
    [-1, 1].forEach((side) => {
      const hornUp = new THREE.Mesh(new THREE.ConeGeometry(strutR * 1.3, H * 0.38, 6), boneMat);
      hornUp.rotation.z = 0.65;
      hornUp.rotation.x = -side * 0.55;
      hornUp.position.set(L * 0.14, H * 0.45, side * W * 1.05);
      const hornLow = new THREE.Mesh(new THREE.ConeGeometry(strutR * 1.2, H * 0.34, 6), boneMat);
      hornLow.rotation.x = -side * 1.1;
      hornLow.position.set(L * 0.18, -H * 0.12, side * W * 1.18);
      g.add(hornUp, hornLow);
    });
  }

  return g;
}

/**
 * Builds the 3D Pterosaur Wing Skeleton (`Pteranodon`, `Quetzalcoatlus`, `Rhamphorhynchus`, etc.)
 * matching `ptero-skeleton.jpg` — stout humerus, twin radius + ulna, wrist carpals + forward pteroid
 * bone, elongated wing metacarpal IV, 3 clawed wing-knuckle fingers, and 4 long tapering tubular
 * wing-finger phalanges (`Phalanx 1..4`) with ZERO wing skin membrane!
 */
function buildPterosaurWingSkeleton(shoulderPt, halfWingspan, boneRadius, boneMat) {
  const g = new THREE.Group();

  [-1, 1].forEach((side) => {
    const pGlenoid = new THREE.Vector3(shoulderPt.x, shoulderPt.y, side * halfWingspan * 0.08);
    const pElbow = new THREE.Vector3(
      shoulderPt.x - halfWingspan * 0.05,
      shoulderPt.y - halfWingspan * 0.04,
      side * halfWingspan * 0.22
    );
    const pWrist = new THREE.Vector3(
      shoulderPt.x + halfWingspan * 0.04,
      shoulderPt.y + halfWingspan * 0.02,
      side * halfWingspan * 0.42
    );
    const pKnuckle = new THREE.Vector3(
      shoulderPt.x + halfWingspan * 0.09,
      shoulderPt.y + halfWingspan * 0.04,
      side * halfWingspan * 0.58
    );

    g.add(
      buildSculptedBoneBetween(pGlenoid, pElbow, boneRadius * 1.25, boneMat, {
        proxFlare: 1.75,
        distFlare: 1.65,
      })
    );

    const rOff = boneRadius * 0.65;
    g.add(
      buildSculptedBoneBetween(
        new THREE.Vector3(pElbow.x + rOff, pElbow.y, pElbow.z),
        new THREE.Vector3(pWrist.x + rOff, pWrist.y, pWrist.z),
        boneRadius * 0.78,
        boneMat
      ),
      buildSculptedBoneBetween(
        new THREE.Vector3(pElbow.x - rOff, pElbow.y, pElbow.z),
        new THREE.Vector3(pWrist.x - rOff, pWrist.y, pWrist.z),
        boneRadius * 0.85,
        boneMat
      )
    );

    const pPteroid = new THREE.Vector3(
      pWrist.x + halfWingspan * 0.08,
      pWrist.y + halfWingspan * 0.02,
      side * halfWingspan * 0.34
    );
    g.add(
      buildSculptedBoneBetween(pWrist, pPteroid, boneRadius * 0.42, boneMat, {
        distFlare: 0.45,
      })
    );

    g.add(
      buildSculptedBoneBetween(pWrist, pKnuckle, boneRadius * 0.92, boneMat, {
        proxFlare: 1.55,
        distFlare: 1.65,
      })
    );

    for (let d = 0; d < 3; d++) {
      const dTip = new THREE.Vector3(
        pKnuckle.x + halfWingspan * 0.055,
        pKnuckle.y - (d - 1) * boneRadius * 1.4,
        pKnuckle.z + side * (d - 1) * boneRadius * 1.2
      );
      g.add(
        buildSculptedBoneBetween(pKnuckle, dTip, boneRadius * 0.34, boneMat, {
          distFlare: 0.35,
        })
      );
    }

    // Match pteranodon.glb wing sweep and downward wingtip curve 1-to-1!
    const ph1 = new THREE.Vector3(
      shoulderPt.x + halfWingspan * 0.04,
      shoulderPt.y + halfWingspan * 0.01,
      side * halfWingspan * 0.74
    );
    const ph2 = new THREE.Vector3(
      shoulderPt.x - halfWingspan * 0.03,
      shoulderPt.y - halfWingspan * 0.06,
      side * halfWingspan * 0.88
    );
    const ph3 = new THREE.Vector3(
      shoulderPt.x - halfWingspan * 0.10,
      shoulderPt.y - halfWingspan * 0.14,
      side * halfWingspan * 0.96
    );
    const ph4 = new THREE.Vector3(
      shoulderPt.x - halfWingspan * 0.16,
      shoulderPt.y - halfWingspan * 0.22,
      side * halfWingspan * 1.02
    );

    g.add(
      buildSculptedBoneBetween(pKnuckle, ph1, boneRadius * 0.78, boneMat, { proxFlare: 1.55, distFlare: 1.45 }),
      buildSculptedBoneBetween(ph1, ph2, boneRadius * 0.62, boneMat, { proxFlare: 1.45, distFlare: 1.35 }),
      buildSculptedBoneBetween(ph2, ph3, boneRadius * 0.46, boneMat, { proxFlare: 1.35, distFlare: 1.25 }),
      buildSculptedBoneBetween(ph3, ph4, boneRadius * 0.32, boneMat, { proxFlare: 1.25, distFlare: 0.35 })
    );
  });

  return g;
}

/**
 * Builds a Marine Reptile 3D Hyperphalangeal Paddle Skeleton (`Mosasaurus`, `Plesiosaurus`, `Liopleurodon`, `Ichthyosaurus`)
 * with stout propodial (humerus/femur), paired epipodials (radius+ulna / tibia+fibula), and 5 diverging
 * rows of multi-jointed phalanges!
 */
function buildMarinePaddleSkeleton(jointPt, paddleLen, boneRadius, boneMat, isForePaddle = true) {
  const g = new THREE.Group();

  [-1, 1].forEach((side) => {
    const pStart = new THREE.Vector3(jointPt.x, jointPt.y, side * Math.abs(jointPt.z));
    const pEpi = new THREE.Vector3(
      jointPt.x - paddleLen * 0.08,
      jointPt.y - paddleLen * 0.16,
      side * (Math.abs(jointPt.z) + paddleLen * 0.24)
    );
    const pWrist = new THREE.Vector3(
      jointPt.x - paddleLen * 0.16,
      jointPt.y - paddleLen * 0.28,
      side * (Math.abs(jointPt.z) + paddleLen * 0.42)
    );

    g.add(
      buildSculptedBoneBetween(pStart, pEpi, boneRadius * 1.35, boneMat, {
        proxFlare: 1.5,
        distFlare: 1.8,
        flattenZ: 0.55,
      })
    );

    const dx = boneRadius * 0.95;
    g.add(
      buildSculptedBoneBetween(
        new THREE.Vector3(pEpi.x + dx, pEpi.y, pEpi.z),
        new THREE.Vector3(pWrist.x + dx, pWrist.y, pWrist.z),
        boneRadius * 0.85,
        boneMat,
        { flattenZ: 0.5 }
      ),
      buildSculptedBoneBetween(
        new THREE.Vector3(pEpi.x - dx, pEpi.y, pEpi.z),
        new THREE.Vector3(pWrist.x - dx, pWrist.y, pWrist.z),
        boneRadius * 0.85,
        boneMat,
        { flattenZ: 0.5 }
      )
    );

    const digits = 5;
    for (let d = 0; d < digits; d++) {
      const frac = (d / (digits - 1) - 0.5) * 2.0;
      const segs = d === 1 || d === 2 ? 6 : 4;
      let prevPt = new THREE.Vector3(
        pWrist.x - frac * boneRadius * 1.4,
        pWrist.y,
        pWrist.z
      );
      for (let s = 1; s <= segs; s++) {
        const sFrac = s / segs;
        const reach = (isForePaddle ? 0.58 : 0.46) * paddleLen * (1.0 - 0.28 * Math.abs(frac));
        const nextPt = new THREE.Vector3(
          pWrist.x - (frac * 0.28 + sFrac * 0.38) * reach,
          pWrist.y - sFrac * reach * 0.42,
          pWrist.z + side * sFrac * reach * 0.88
        );
        g.add(
          buildSculptedBoneBetween(prevPt, nextPt, boneRadius * 0.44 * (1.0 - 0.45 * sFrac), boneMat, {
            proxFlare: 1.35,
            distFlare: 1.3,
            flattenZ: 0.55,
          })
        );
        prevPt = nextPt;
      }
    }
  });

  return g;
}

/**
 * Extracts exact 1-to-1 volumetric & anatomical stations directly from the posed vertices
 * and skeleton bones of `realHolder` so the fossil skeleton superimposes 1-to-1 on the living model.
 */
function extractExact1To1Anatomy(realHolder, holderBox, bodyProfile, species) {
  const size = holderBox.getSize(new THREE.Vector3());
  const center = holderBox.getCenter(new THREE.Vector3());
  const min = holderBox.min;

  const rig = species?.rigType || 'theropod';
  const id = species?.id || '';
  const isSauropod = rig === 'sauropod';
  const isStegosaur = rig === 'stegosaur';
  const isAnkylosaur = rig === 'ankylosaur';
  const isPterosaur = rig === 'pterosaur';
  const isPlesiosaur = rig === 'plesiosaur' || /plesiosaurus|elasmosaurus|styxosaurus/i.test(id);
  const isMarine = species?.domain === 'Ocean';
  const isQuadruped =
    isSauropod ||
    isStegosaur ||
    isAnkylosaur ||
    rig === 'ceratopsian' ||
    rig === 'synapsid' ||
    /iguanodon|edmontosaurus|maiasaura/i.test(id);

  // Sample posed vertices in realHolder local space across 24 longitudinal bins
  realHolder.updateMatrixWorld(true);
  const invHolderWorld = realHolder.matrixWorld.clone().invert();
  const numBins = 24;
  const slices = Array.from({ length: numBins }, () => ({
    ys: [],
    midYs: [],
    zs: [],
    minY: Infinity,
    maxY: -Infinity,
    midMaxY: -Infinity,
    maxAbsZ: 0,
  }));

  const v = new THREE.Vector3();
  const lenSize = Math.max(0.001, size.x);
  const heightSize = Math.max(0.001, size.y);
  const halfLatSpan = Math.max(0.001, size.z * 0.5);

  realHolder.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
    if (obj.name && /Smithsonian|Fossil|Museum/i.test(obj.name)) return;
    const posAttr = obj.geometry.attributes.position;
    const step = Math.max(1, Math.floor(posAttr.count / 1200));
    const meshToHolder = new THREE.Matrix4().multiplyMatrices(invHolderWorld, obj.matrixWorld);

    for (let i = 0; i < posAttr.count; i += step) {
      if (obj.isSkinnedMesh && typeof obj.getVertexPosition === 'function') {
        obj.getVertexPosition(i, v);
      } else {
        v.fromBufferAttribute(posAttr, i);
      }
      v.applyMatrix4(meshToHolder);
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) continue;

      const u = Math.min(0.9999, Math.max(0, (v.x - min.x) / lenSize));
      const b = Math.min(numBins - 1, Math.floor(u * numBins));
      const yNorm = Math.min(1, Math.max(0, (v.y - min.y) / heightSize));
      const absZNorm = Math.abs(v.z - center.z) / halfLatSpan;

      const sl = slices[b];
      sl.ys.push(yNorm);
      sl.zs.push(v.z - center.z);
      if (yNorm < sl.minY) sl.minY = yNorm;
      if (yNorm > sl.maxY) sl.maxY = yNorm;
      if (absZNorm > sl.maxAbsZ) sl.maxAbsZ = absZNorm;
      if (absZNorm <= 0.25) {
        sl.midYs.push(yNorm);
        if (yNorm > sl.midMaxY) sl.midMaxY = yNorm;
      }
    }
  });

  // Compute percentile helpers per slice so hanging legs don't drag the torso/neck spine down!
  const sliceEnvelope = slices.map((sl, b) => {
    const uMid = (b + 0.5) / numBins;
    const sorted = (sl.midYs.length >= 5 ? sl.midYs : sl.ys).slice().sort((a, c) => a - c);
    if (sorted.length === 0) {
      const pf = Math.min(15, Math.max(0, Math.floor(uMid * 16)));
      const bp = bodyProfile[pf] || new THREE.Vector2(0.4, 0.8);
      return {
        u: uMid,
        vTop: bp.y,
        vBot: bp.x,
        vMed: (bp.x + bp.y) * 0.5,
        minY: bp.x,
        rawMaxY: bp.y,
        maxAbsZ: 0.4,
      };
    }
    const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    let vTop = q(uMid > 0.65 ? 0.96 : 0.92);
    let vBot = q(0.18);
    let vMed = q(0.58);

    // On stegosaurs or spinosaurs, dorsal plates/sails sit above the vertebral centra
    if (isStegosaur && uMid >= 0.14 && uMid <= 0.84) {
      const arch = Math.sin(((uMid - 0.14) / 0.70) * Math.PI);
      vTop = Math.min(vTop, 0.46 + 0.23 * arch);
      vMed = Math.min(vMed, vTop - 0.08);
    } else if (/spinosaurus|dimetrodon|edaphosaurus/i.test(id) && uMid >= 0.34 && uMid <= 0.74) {
      const arch = Math.sin(((uMid - 0.34) / 0.40) * Math.PI);
      vTop = Math.min(vTop, 0.54 + 0.14 * arch);
      vMed = Math.min(vMed, vTop - 0.07);
    }

    // If this slice reaches the ground (limb column), keep vBot at the upper body/thigh mass
    if (sl.minY < 0.12 && uMid > 0.25 && uMid < 0.82 && !isMarine) {
      const upperYs = sorted.filter((y) => y >= 0.30);
      if (upperYs.length >= 3) {
        vBot = upperYs[Math.floor(0.15 * upperYs.length)];
        vMed = upperYs[Math.floor(0.58 * upperYs.length)];
      } else {
        vBot = Math.max(vBot, vTop - 0.32);
      }
    }

    return {
      u: uMid,
      vTop,
      vBot: Math.min(vTop - 0.04, vBot),
      vMed,
      minY: sl.minY,
      rawMaxY: sl.maxY,
      maxAbsZ: sl.maxAbsZ,
    };
  });

  // Smooth the extracted axial curve lightly across interior slices
  for (let pass = 0; pass < 2; pass++) {
    const copyTop = sliceEnvelope.map((s) => s.vTop);
    const copyBot = sliceEnvelope.map((s) => s.vBot);
    const copyMed = sliceEnvelope.map((s) => s.vMed);
    for (let b = 1; b < numBins - 1; b++) {
      sliceEnvelope[b].vTop = 0.22 * copyTop[b - 1] + 0.56 * copyTop[b] + 0.22 * copyTop[b + 1];
      sliceEnvelope[b].vBot = 0.22 * copyBot[b - 1] + 0.56 * copyBot[b] + 0.22 * copyBot[b + 1];
      sliceEnvelope[b].vMed = 0.22 * copyMed[b - 1] + 0.56 * copyMed[b] + 0.22 * copyMed[b + 1];
    }
  }

  // Detect exact limb/flipper stations from ground-contact (`minY < 0.11`) or lateral `maxAbsZ` peaks!
  let hipU = 0.52;
  let shoulderU = 0.72;
  let skullStartU = 0.84;

  if (isMarine) {
    if (isPlesiosaur) {
      hipU = 0.22;
      shoulderU = 0.48;
      skullStartU = 0.93;
    } else if (/ichthyosaurus|shonisaurus/i.test(id)) {
      hipU = 0.34;
      shoulderU = 0.64;
      skullStartU = 0.76;
    } else {
      hipU = 0.42;
      shoulderU = 0.68;
      skullStartU = 0.77;
    }
  } else if (isQuadruped) {
    let rearSum = 0, rearW = 0, frontSum = 0, frontW = 0;
    sliceEnvelope.forEach((s) => {
      if (s.minY < 0.11) {
        const w = Math.max(0.01, 0.12 - s.minY);
        if (s.u >= 0.30 && s.u <= 0.58) {
          rearSum += s.u * w;
          rearW += w;
        } else if (s.u > 0.58 && s.u <= 0.84) {
          frontSum += s.u * w;
          frontW += w;
        }
      }
    });
    if (isSauropod) {
      hipU = rearW > 0 ? rearSum / rearW : 0.45;
      shoulderU = frontW > 0 ? frontSum / frontW : 0.68;
      skullStartU = /paluxysaurus|brachiosaurus|camarasaurus|argentinosaurus/i.test(id) ? 0.90 : 0.89;
    } else if (isStegosaur) {
      hipU = rearW > 0 ? rearSum / rearW : 0.53;
      shoulderU = frontW > 0 ? frontSum / frontW : 0.74;
      skullStartU = 0.87;
    } else if (isAnkylosaur) {
      hipU = rearW > 0 ? rearSum / rearW : 0.48;
      shoulderU = frontW > 0 ? frontSum / frontW : 0.70;
      skullStartU = 0.85;
    } else if (rig === 'ceratopsian') {
      hipU = rearW > 0 ? rearSum / rearW : 0.42;
      shoulderU = frontW > 0 ? frontSum / frontW : 0.65;
      skullStartU = 0.70;
    } else {
      hipU = rearW > 0 ? rearSum / rearW : 0.46;
      shoulderU = frontW > 0 ? frontSum / frontW : 0.70;
      skullStartU = 0.82;
    }
  } else if (!isPterosaur) {
    let bipedSum = 0, bipedW = 0;
    sliceEnvelope.forEach((s) => {
      if (s.minY < 0.11 && s.u >= 0.36 && s.u <= 0.74) {
        const w = Math.max(0.01, 0.12 - s.minY);
        bipedSum += s.u * w;
        bipedW += w;
      }
    });
    hipU = bipedW > 0 ? bipedSum / bipedW : 0.56;
    shoulderU = Math.min(0.80, hipU + 0.14);

    if (/therizinosaurus|gallimimus|oviraptor|gigantoraptor|deinocheirus/i.test(id)) {
      skullStartU = 0.88;
    } else if (/parasaurolophus|corythosaurus/i.test(id)) {
      skullStartU = 0.87;
    } else if (/velociraptor|deinonychus|utahraptor|archaeopteryx|microraptor|pachycephalosaurus|stygimoloch/i.test(id)) {
      skullStartU = 0.85;
    } else if (/spinosaurus|baryonyx|suchomimus/i.test(id)) {
      skullStartU = 0.78;
    } else {
      skullStartU = 0.79;
    }
  }

  return {
    sliceEnvelope,
    numBins,
    hipU,
    shoulderU,
    skullStartU,
    tailEndU: Math.max(0.14, hipU - 0.05),
  };
}

/**
 * Builds a complete, clade-accurate 3D Smithsonian / Natural History Museum Fossil Skeleton
 * (`THREE.Group`) fitted 1-to-1 to the posed 3D mesh and anatomy of `realHolder`.
 */
export function buildSmithsonianFossilSkeletonForGLB(realHolder, holderBox, bodyProfile, species) {
  const root = new THREE.Group();
  root.name = `SmithsonianFossilMount_${species?.id || 'dino'}`;

  const boneMat = createSmithsonianBonePBRMaterial(
    species?.rigType === 'sauropod' || species?.rigType === 'pterosaur' ? 'ivory' : 'ochre'
  );
  const darkMat = createSmithsonianBonePBRMaterial('matrix');
  const armatureMat = createMuseumArmatureMaterial();

  const size = holderBox.getSize(new THREE.Vector3());
  const center = holderBox.getCenter(new THREE.Vector3());
  const min = holderBox.min;

  const rig = species?.rigType || 'theropod';
  const id = species?.id || '';
  const isSauropod = rig === 'sauropod';
  const isStegosaur = rig === 'stegosaur';
  const isAnkylosaur = rig === 'ankylosaur';
  const isPterosaur = rig === 'pterosaur';
  const isPlesiosaur = rig === 'plesiosaur' || /plesiosaurus|elasmosaurus|styxosaurus/i.test(id);
  const isMarine = species?.domain === 'Ocean';
  const isQuadruped =
    isSauropod ||
    isStegosaur ||
    isAnkylosaur ||
    rig === 'ceratopsian' ||
    rig === 'synapsid' ||
    /iguanodon|edmontosaurus|maiasaura/i.test(id);

  // On wide-wingspan pterosaurs (e.g. pteranodon.glb), size.x is the full wingspan and size.z is the body length.
  // In pteranodon.glb, the head/beak points toward +Z and the crest points toward -Z, so rotating root by -PI/2
  // around Y places the beak at +Z and wings across X, matching pteranodon.glb 1-to-1!
  const pteroSwapXZ = isPterosaur && size.x > size.z * 1.15;
  const lenSize = pteroSwapXZ
    ? Math.max(0.7, size.z * 0.96)
    : Math.max(0.5, size.x);
  const lenMin = pteroSwapXZ ? center.x - lenSize * 0.5 : min.x;
  const heightSize = Math.max(0.3, size.y);
  const rawHalfWidth = pteroSwapXZ
    ? Math.max(0.5, size.x * 0.5)
    : Math.max(0.15, size.z * 0.5);

  const anat = extractExact1To1Anatomy(realHolder, holderBox, bodyProfile, species);

  const toHolderPt = (u, vNorm, latOffset = 0) => {
    const lCoord = lenMin + u * lenSize;
    const yCoord = min.y + vNorm * heightSize;
    return new THREE.Vector3(lCoord, yCoord, center.z + latOffset);
  };

  // Sample 1-to-1 vertical envelope (vBelly, vSpine, vMed, maxAbsZ) at any normalized station u in [0..1]
  const sampleEnvelope = (u) => {
    if (isPterosaur) {
      const arch = Math.sin(Math.min(1, Math.max(0, (u - 0.25) / 0.70)) * Math.PI);
      const vBelly = 0.42 + 0.06 * u;
      const vSpine = vBelly + 0.16 + 0.12 * arch;
      return { vBelly, vSpine, vMed: 0.45 * vBelly + 0.55 * vSpine, rawMaxY: vSpine, maxAbsZ: 0.3 };
    }
    const f = Math.min(anat.numBins - 1, Math.max(0, u * (anat.numBins - 1)));
    const i0 = Math.floor(f);
    const i1 = Math.min(anat.numBins - 1, i0 + 1);
    const fr = f - i0;
    const s0 = anat.sliceEnvelope[i0];
    const s1 = anat.sliceEnvelope[i1];
    let vBelly = s0.vBot * (1 - fr) + s1.vBot * fr;
    let vSpine = s0.vTop * (1 - fr) + s1.vTop * fr;
    let vMed = s0.vMed * (1 - fr) + s1.vMed * fr;
    if (isPlesiosaur && u > anat.shoulderU) {
      const neckFrac = Math.max(0, (u - anat.shoulderU) / Math.max(0.1, 1.0 - anat.shoulderU));
      const targetMid = 0.44 + 0.50 * Math.pow(neckFrac, 1.45);
      vBelly = Math.max(vBelly, targetMid - 0.045);
      vSpine = Math.max(vSpine, targetMid + 0.045);
      vMed = Math.max(vMed, targetMid);
    }
    return {
      vBelly,
      vSpine,
      vMed,
      rawMaxY: (s0.rawMaxY ?? s0.vTop) * (1 - fr) + (s1.rawMaxY ?? s1.vTop) * fr,
      maxAbsZ: s0.maxAbsZ * (1 - fr) + s1.maxAbsZ * fr,
    };
  };

  const tailEndU = isPterosaur && !/rhamphorhynchus|eudimorphodon|dimorphodon/i.test(id)
    ? 0.28
    : anat.tailEndU;
  const hipU = isPterosaur ? tailEndU + 0.06 : anat.hipU;
  const shoulderU = isPterosaur ? 0.50 : anat.shoulderU;
  const skullStartU = isPterosaur ? 0.60 : anat.skullStartU;

  const torsoHalfW = isPterosaur
    ? Math.min(rawHalfWidth * 0.11, lenSize * 0.12)
    : isMarine
      ? Math.min(rawHalfWidth * 0.38, lenSize * 0.12)
      : Math.min(rawHalfWidth * 0.66, lenSize * (isAnkylosaur ? 0.19 : 0.135));

  // 1. Construct smooth 3D Vertebral Column Curve from tail tip (u = 0.02) to skull base (u = skullStartU)
  const spineControlPts = [];
  const controlSteps = 22;
  for (let i = 0; i <= controlSteps; i++) {
    const t = i / controlSteps;
    const u = 0.02 + t * (skullStartU - 0.02);
    const { vBelly, vSpine, vMed } = sampleEnvelope(u);
    const bodySpan = Math.max(0.04, vSpine - vBelly);
    const vCentrum =
      u < tailEndU
        ? vMed
        : u > shoulderU
          ? 0.18 * vBelly + 0.82 * vSpine
          : vBelly + bodySpan * 0.78;
    spineControlPts.push(toHolderPt(u, vCentrum, 0));
  }
  const spineCurve = new THREE.CatmullRomCurve3(spineControlPts);

  const canalGeo = new THREE.TubeGeometry(spineCurve, 48, Math.max(0.009, lenSize * 0.0058), 8, false);
  root.add(new THREE.Mesh(canalGeo, darkMat));

  // 2. Populate 38–52 Individual Sculpted 3D Vertebrae along the 1-to-1 Spine Curve
  const vertCount = isSauropod || isPlesiosaur ? 48 : isPterosaur ? 22 : 40;
  const hasTallSail =
    /spinosaurus|suchomimus|dimetrodon|edaphosaurus|amargasaurus|ouranosaurus|deinocheirus|acrocanthosaurus/i.test(id);

  for (let vIdx = 0; vIdx < vertCount; vIdx++) {
    const sFrac = (vIdx + 0.5) / vertCount;
    const u = 0.02 + sFrac * (skullStartU - 0.02);
    const pt = spineCurve.getPointAt(sFrac);
    const tangent = spineCurve.getTangentAt(sFrac);

    const isTail = u < tailEndU;
    const isSacral = Math.abs(u - hipU) < 0.045;
    const isThoracic = u >= tailEndU && u <= shoulderU + 0.02;
    const isNeck = u > shoulderU + 0.02;

    const tailTaper = isTail ? Math.pow(Math.max(0.15, u / tailEndU), 0.72) : 1.0;
    const neckTaper = isNeck
      ? 1.0 - 0.45 * Math.max(0, (u - shoulderU) / Math.max(0.05, skullStartU - shoulderU))
      : 1.0;

    const baseCentrumR =
      Math.max(0.012, lenSize * (isSauropod || isPlesiosaur ? 0.014 : 0.016)) * tailTaper * neckTaper;
    const centrumLen = ((lenSize * (skullStartU - 0.02)) / vertCount) * 0.82;

    let spineH = baseCentrumR * (isSacral ? 2.3 : isThoracic ? 2.1 : isTail ? 1.5 : 1.3);
    if (hasTallSail && u >= tailEndU - 0.04 && u <= shoulderU + 0.04) {
      const { rawMaxY } = sampleEnvelope(u);
      const topY = min.y + rawMaxY * heightSize;
      const measuredSailH = Math.max(0, topY - pt.y - baseCentrumR * 0.8);
      const sailArch = Math.sin(
        Math.min(1, Math.max(0, (u - (tailEndU - 0.04)) / (shoulderU - tailEndU + 0.08))) * Math.PI
      );
      spineH = Math.max(
        spineH,
        measuredSailH > 0.05 ? measuredSailH : heightSize * 0.28 * Math.pow(sailArch, 0.85)
      );
    } else if (/spinosaurus/i.test(id) && isTail && u > 0.08) {
      const tailPad = Math.sin(((u - 0.08) / Math.max(0.05, tailEndU - 0.08)) * Math.PI);
      spineH = Math.max(spineH, heightSize * 0.14 * tailPad);
    }

    const chevronLen =
      isTail && u > 0.05
        ? baseCentrumR *
          (/spinosaurus|mosasaurus|tylosaurus/i.test(id) ? 3.1 : 2.1) *
          Math.sin(((u - 0.05) / Math.max(0.05, tailEndU - 0.05)) * Math.PI)
        : 0.0;

    const cervicalRibLen =
      isNeck && (isSauropod || isPlesiosaur || rig === 'theropod')
        ? centrumLen * (isSauropod ? 1.8 : 1.2)
        : 0.0;

    const vertGroup = buildVertebraAssembly(
      pt,
      tangent,
      baseCentrumR,
      centrumLen,
      boneMat,
      darkMat,
      {
        spineHeight: spineH,
        spineTiltBack: isNeck ? 0.10 : 0.26,
        spineWidth: baseCentrumR * 0.78,
        transverseSpan: isThoracic || isSacral ? baseCentrumR * 1.85 : baseCentrumR * 1.05,
        chevronLen,
        cervicalRibLen,
        bifurcatedSpine: isNeck && /diplodocus|apatosaurus|brontosaurus|amargasaurus/i.test(id),
      }
    );
    root.add(vertGroup);
  }

  // 3. Build 13–14 Pairs of Open-Air Curved 3D Thoracic Costae (Ribs) & Sternal/Gastralia Basket
  const ribCount = isPterosaur ? 8 : isSauropod ? 12 : 13;
  const ribStartU = hipU + 0.025;
  const ribEndU = shoulderU + 0.01;
  const ribRadius = Math.max(0.008, lenSize * (isSauropod ? 0.0070 : 0.0062));

  for (let r = 0; r < ribCount; r++) {
    const rFrac = r / Math.max(1, ribCount - 1);
    const u = ribStartU + rFrac * Math.max(0.08, ribEndU - ribStartU);
    const sFrac = Math.min(1, Math.max(0, (u - 0.02) / (skullStartU - 0.02)));
    const spinePt = spineCurve.getPointAt(sFrac);
    const { vBelly, vSpine } = sampleEnvelope(u);

    const barrelBell = Math.sin(Math.pow(rFrac, 0.78) * Math.PI);
    const wHalfHere = torsoHalfW * (0.64 + 0.40 * barrelBell);

    const maxDrop = Math.max(heightSize * 0.13, (vSpine - vBelly) * heightSize * 0.80);
    const flankArch = 0.48 + 0.52 * Math.sin(Math.min(1, rFrac * 1.25) * (Math.PI * 0.82));
    const ribDrop = maxDrop * flankArch;
    const sweepBack = lenSize * 0.042 * (0.6 + 0.4 * barrelBell);

    const ribPair = buildCurvedThoracicRibPair(
      spinePt,
      wHalfHere,
      ribDrop,
      sweepBack,
      ribRadius * (0.82 + 0.24 * barrelBell),
      boneMat,
      rFrac > 0.25 && rFrac < 0.85 && !isStegosaur && !isAnkylosaur
    );
    root.add(ribPair);
  }

  // 4. Build Clade-Specific Dorsal Osteoderm Plates, Thagomizer Spikes, or Ankylosaur Tail Club!
  if (isStegosaur) {
    const isKentro = /kentrosaurus|tuojiangosaurus/i.test(id);
    const platePairs = 14;
    for (let p = 0; p < platePairs; p++) {
      const pFrac = p / (platePairs - 1);
      const u = 0.08 + pFrac * (skullStartU - 0.12);
      const sFrac = Math.min(1, Math.max(0, (u - 0.02) / (skullStartU - 0.02)));
      const spinePt = spineCurve.getPointAt(sFrac);
      const { rawMaxY } = sampleEnvelope(u);
      const actualTopY = min.y + rawMaxY * heightSize;
      const archScale = 0.36 + 0.64 * Math.sin(Math.pow(pFrac, 0.85) * Math.PI);

      [-1, 1].forEach((side) => {
        if (!isKentro && u >= 0.20 && (p + (side > 0 ? 1 : 0)) % 2 === 0) return;

        const isSpike = u < 0.20 || (isKentro && pFrac <= 0.55);
        const zLat = spinePt.z + side * torsoHalfW * (isSpike ? 0.26 : 0.16);
        const basePt = new THREE.Vector3(
          spinePt.x + (side > 0 && !isKentro ? lenSize * 0.014 : 0),
          spinePt.y + lenSize * 0.012,
          zLat
        );

        if (isSpike) {
          const spikeLen = heightSize * (u < 0.20 ? 0.26 : 0.34 * archScale);
          const tipPt = new THREE.Vector3(
            basePt.x - spikeLen * 0.68,
            basePt.y + spikeLen * 0.66,
            zLat + side * spikeLen * (u < 0.20 ? 0.48 : 0.24)
          );
          root.add(
            buildSculptedBoneBetween(basePt, tipPt, lenSize * 0.013, boneMat, {
              proxFlare: 1.55,
              distFlare: 0.22,
              bowForward: 0.05,
            })
          );
        } else {
          const measuredH = Math.max(heightSize * 0.10, actualTopY - basePt.y);
          const plateH = Math.min(heightSize * 0.32, Math.max(measuredH, heightSize * 0.22 * archScale));
          const plateW = lenSize * (isKentro ? 0.042 : 0.066) * archScale;
          const shape = new THREE.Shape();
          shape.moveTo(-plateW * 0.42, 0);
          shape.lineTo(-plateW * 0.68, plateH * 0.48);
          shape.lineTo(0, plateH);
          shape.lineTo(plateW * 0.62, plateH * 0.52);
          shape.lineTo(plateW * 0.38, 0);
          shape.closePath();

          const plateGeo = new THREE.ExtrudeGeometry(shape, {
            depth: lenSize * 0.008,
            bevelEnabled: true,
            bevelThickness: lenSize * 0.0035,
            bevelSize: lenSize * 0.0035,
            bevelSegments: 2,
          });
          plateGeo.center();
          const plateMesh = new THREE.Mesh(plateGeo, boneMat);
          plateMesh.position.set(basePt.x, basePt.y + plateH * 0.46, zLat);
          plateMesh.rotation.z = 0.18;
          plateMesh.rotation.x = side * 0.12;
          plateMesh.castShadow = true;
          root.add(plateMesh);
        }
      });
    }

    if (isKentro) {
      const shFrac = Math.min(1, Math.max(0, (shoulderU - 0.02) / (skullStartU - 0.02)));
      const shPt = spineCurve.getPointAt(shFrac);
      [-1, 1].forEach((side) => {
        const pStart = new THREE.Vector3(shPt.x, shPt.y - heightSize * 0.18, shPt.z + side * torsoHalfW * 0.95);
        const pTip = new THREE.Vector3(
          shPt.x - lenSize * 0.16,
          shPt.y - heightSize * 0.04,
          shPt.z + side * (torsoHalfW * 0.95 + heightSize * 0.28)
        );
        root.add(
          buildSculptedBoneBetween(pStart, pTip, lenSize * 0.017, boneMat, {
            proxFlare: 1.65,
            distFlare: 0.2,
          })
        );
      });
    }
  } else if (isAnkylosaur) {
    const tailTipPt = spineCurve.getPointAt(0.02);
    if (/ankylosaurus/i.test(id)) {
      [-1, 1].forEach((side) => {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(lenSize * 0.046, 12, 10), boneMat);
        lobe.scale.set(1.45, 0.72, 0.95);
        lobe.position.set(tailTipPt.x - lenSize * 0.02, tailTipPt.y, tailTipPt.z + side * lenSize * 0.034);
        root.add(lobe);
      });
    }
    for (let b = 0; b < 7; b++) {
      const u = (hipU - 0.06) + (b / 6) * (shoulderU - hipU + 0.10);
      const sFrac = Math.min(1, Math.max(0, (u - 0.02) / (skullStartU - 0.02)));
      const spPt = spineCurve.getPointAt(sFrac);
      [-1, 1].forEach((side) => {
        for (let row = 1; row <= 2; row++) {
          const zScute = spPt.z + side * torsoHalfW * (row * 0.46);
          const yScute = spPt.y + lenSize * 0.02 - row * heightSize * 0.04;
          const scute = new THREE.Mesh(new THREE.ConeGeometry(lenSize * 0.019, lenSize * 0.040, 6), boneMat);
          scute.rotation.x = side * (0.28 * row);
          scute.position.set(spPt.x, yScute, zScute);
          root.add(scute);
        }
      });
    }
  }

  // 5. Build 3D Pelvic Girdle (at `hipU`) & Pectoral Girdle (at `shoulderU`)
  const hipSFrac = Math.min(1, Math.max(0, (hipU - 0.02) / (skullStartU - 0.02)));
  const hipSpinePt = spineCurve.getPointAt(hipSFrac);
  const pelvisLen = lenSize * (isSauropod ? 0.13 : 0.15);
  const pelvisH = heightSize * (isSauropod ? 0.19 : 0.22);
  const pelvisHalfW = torsoHalfW * 0.86;

  if (!isMarine) {
    root.add(
      buildSculptedPelvicGirdle(hipSpinePt, pelvisLen, pelvisH, pelvisHalfW, boneMat, rig)
    );
  }

  const shSFrac = Math.min(1, Math.max(0, (shoulderU - 0.02) / (skullStartU - 0.02)));
  const shSpinePt = spineCurve.getPointAt(shSFrac);
  const { vBelly: shBelly, vSpine: shSpine } = sampleEnvelope(shoulderU);
  const glenoidY = min.y + (shBelly + (shSpine - shBelly) * 0.34) * heightSize;
  const shoulderJointPt = new THREE.Vector3(shSpinePt.x, glenoidY, center.z);
  const scapLen = heightSize * (isSauropod ? 0.30 : 0.24);

  if (!isMarine) {
    root.add(
      buildSculptedPectoralGirdle(shoulderJointPt, scapLen, torsoHalfW * 0.92, boneMat)
    );
  }

  // 6. Build 3D Appendicular Limbs (Hindlimbs, Forelimbs, Pterosaur Wings, or Marine Paddles) at 1-to-1 Stations
  const groundY = min.y + heightSize * 0.015;
  const limbBoneR = Math.max(0.015, lenSize * (isSauropod ? 0.019 : 0.0155));

  if (isMarine) {
    const forePaddlePt = new THREE.Vector3(
      shSpinePt.x,
      shSpinePt.y - heightSize * 0.11,
      torsoHalfW * 0.88
    );
    const hindPaddlePt = new THREE.Vector3(
      hipSpinePt.x,
      hipSpinePt.y - heightSize * 0.10,
      torsoHalfW * 0.78
    );
    root.add(
      buildMarinePaddleSkeleton(forePaddlePt, lenSize * (isPlesiosaur ? 0.25 : 0.20), limbBoneR * 0.85, boneMat, true),
      buildMarinePaddleSkeleton(hindPaddlePt, lenSize * (isPlesiosaur ? 0.23 : 0.16), limbBoneR * 0.75, boneMat, false)
    );
  } else if (isPterosaur) {
    root.add(
      buildPterosaurWingSkeleton(
        new THREE.Vector3(shSpinePt.x, shSpinePt.y - heightSize * 0.04, 0),
        rawHalfWidth * 0.96,
        limbBoneR * 0.85,
        boneMat
      )
    );
    [-1, 1].forEach((side) => {
      const hipSocket = new THREE.Vector3(
        hipSpinePt.x,
        hipSpinePt.y - pelvisH * 0.22,
        hipSpinePt.z + side * pelvisHalfW
      );
      const footPt = new THREE.Vector3(
        hipSpinePt.x - lenSize * 0.12,
        hipSpinePt.y - heightSize * 0.34,
        hipSpinePt.z + side * pelvisHalfW * 1.45
      );
      root.add(
        buildArticulatedLimb(hipSocket, footPt, limbBoneR * 0.62, boneMat, {
          isHindlimb: true,
          isDigitigrade: true,
          toeCount: 4,
        })
      );
    });
  } else {
    // Terrestrial Hindlimbs positioned directly over the 1-to-1 detected ground-contact station `hipU`
    [-1, 1].forEach((side, idx) => {
      const strideOff = (idx === 0 ? 1 : -1) * lenSize * 0.024;
      const hipSocket = new THREE.Vector3(
        hipSpinePt.x,
        hipSpinePt.y - pelvisH * 0.24,
        hipSpinePt.z + side * pelvisHalfW * 0.96
      );
      const footPt = new THREE.Vector3(
        hipSpinePt.x + strideOff,
        groundY,
        hipSpinePt.z + side * pelvisHalfW * 1.04
      );
      root.add(
        buildArticulatedLimb(hipSocket, footPt, limbBoneR, boneMat, {
          isHindlimb: true,
          isDigitigrade: !isSauropod && !isStegosaur && !isAnkylosaur,
          toeCount: isSauropod || isAnkylosaur ? 4 : 3,
          hasSickleClaw: /velociraptor|deinonychus|utahraptor|microraptor/i.test(id),
          bowOutward: 0.04,
        })
      );
    });

    // Forelimbs (Quadrupedal Columnar/Bowed Forelimbs OR Clade-Proportioned Bipedal Arms)
    const isGiantClawTheri = /therizinosaurus|deinocheirus/i.test(id);
    const isVestigialArm = /carnotaurus/i.test(id);
    const isLongArmRaptorOrSpino =
      /velociraptor|deinonychus|utahraptor|archaeopteryx|microraptor|spinosaurus|baryonyx|suchomimus|gallimimus|oviraptor|gigantoraptor/i.test(
        id
      );

    [-1, 1].forEach((side, idx) => {
      const strideOff = (idx === 0 ? -1 : 1) * lenSize * 0.022;
      const glenoidSocket = new THREE.Vector3(
        shoulderJointPt.x,
        shoulderJointPt.y,
        shoulderJointPt.z + side * torsoHalfW * 0.92
      );
      const armDrop = isGiantClawTheri
        ? heightSize * 0.36
        : isVestigialArm
          ? heightSize * 0.12
          : isLongArmRaptorOrSpino
            ? heightSize * 0.28
            : heightSize * 0.22;
      const armForward = isGiantClawTheri
        ? lenSize * 0.09
        : isVestigialArm
          ? -lenSize * 0.02
          : lenSize * 0.06;

      const handPt = isQuadruped
        ? new THREE.Vector3(
            shoulderJointPt.x + lenSize * 0.015 + strideOff,
            groundY,
            shoulderJointPt.z + side * torsoHalfW * 0.96
          )
        : new THREE.Vector3(
            shoulderJointPt.x + armForward,
            Math.max(groundY + heightSize * 0.08, shoulderJointPt.y - armDrop),
            shoulderJointPt.z + side * torsoHalfW * (isGiantClawTheri ? 1.05 : 0.82)
          );
      root.add(
        buildArticulatedLimb(
          glenoidSocket,
          handPt,
          limbBoneR *
            (isSauropod
              ? 0.92
              : isQuadruped
                ? 0.78
                : isGiantClawTheri
                  ? 0.72
                  : isVestigialArm
                    ? 0.34
                    : 0.54),
          boneMat,
          {
            isHindlimb: false,
            isDigitigrade: !isSauropod,
            toeCount: isQuadruped ? 4 : isVestigialArm ? 2 : 3,
            giantScytheClaws: isGiantClawTheri,
            bowOutward: isStegosaur || isAnkylosaur || rig === 'synapsid' ? 0.14 : 0.03,
          }
        )
      );
    });
  }

  // 7. Build the 3D Open-Fenestra Museum Fossil Skull at the Exact 1-to-1 Head Station (`u = skullStartU..1.0`)
  const headBasePt = spineCurve.getPointAt(1.0);
  const headMidU = Math.min(0.96, skullStartU + (1.0 - skullStartU) * 0.55);
  const { vBelly: skBelly, vSpine: skSpine } = sampleEnvelope(headMidU);
  const headTipEnv = sampleEnvelope(0.97);
  const headTipPt = toHolderPt(0.98, 0.25 * headTipEnv.vBelly + 0.75 * headTipEnv.vSpine, 0);
  const headTangent = new THREE.Vector3().subVectors(headTipPt, headBasePt);
  if (headTangent.lengthSq() < 0.0001) {
    headTangent.copy(spineCurve.getTangentAt(1.0));
  } else {
    headTangent.normalize();
  }

  const skullLen = Math.max(lenSize * 0.085, lenSize * (1.0 - skullStartU));
  const rawSkullH = (skSpine - skBelly) * heightSize * 0.85;
  const maxSkullH =
    isSauropod || isPlesiosaur || /therizinosaurus|gallimimus|stegosaurus|kentrosaurus/i.test(id)
      ? skullLen * 0.68
      : heightSize * 0.28;
  const skullHeight = Math.max(
    skullLen * (isPterosaur ? 0.28 : 0.38),
    Math.min(maxSkullH, rawSkullH)
  );
  const skullHalfW = Math.max(
    skullLen * (isPterosaur ? 0.15 : 0.22),
    Math.min(skullLen * 0.45, torsoHalfW * (isSauropod || isPlesiosaur ? 0.34 : 0.52))
  );

  const skullGroup = buildMuseumFossilSkull(
    headBasePt,
    headTangent,
    skullLen,
    skullHeight,
    skullHalfW,
    species,
    boneMat
  );
  root.add(skullGroup);

  // 8. Add Dark Gunmetal Smithsonian Museum Steel Armature Support Rods (for terrestrial mounts)
  if (!isMarine && !isPterosaur) {
    const rodR = Math.max(0.010, lenSize * 0.0052);
    const pelvisRodPt = new THREE.Vector3(
      hipSpinePt.x,
      hipSpinePt.y - pelvisH * 0.22,
      center.z
    );
    const chestRodPt = new THREE.Vector3(
      shSpinePt.x,
      shSpinePt.y - heightSize * 0.12,
      center.z
    );
    root.add(
      buildArmatureSupportRod(groundY, pelvisRodPt, rodR, armatureMat),
      buildArmatureSupportRod(groundY, chestRodPt, rodR, armatureMat)
    );
    if (isSauropod) {
      const neckMidPt = spineCurve.getPointAt(0.86);
      root.add(buildArmatureSupportRod(groundY, neckMidPt, rodR * 0.85, armatureMat));
    }
  }

  // When a pterosaur's wingspan was along X in realHolder (e.g. pteranodon.glb),
  // rotate root by -PI/2 around Y so its beak points toward +Z and its crest points toward -Z,
  // matching pteranodon.glb 1-to-1!
  if (pteroSwapXZ) {
    root.rotation.y = -Math.PI / 2;
  }

  return root;
}

/**
 * Enhances a real loaded 3D Museum Skeleton `.glb` (`smithsonian-triceratops.glb` or
 * `trex-skeleton-rigged.glb`) with Smithsonian permineralized bone shading and museum armature
 * support rods.
 */
export function enhanceRealMuseumSkeletonGLB(
  skelHolder,
  skelBox,
  species,
  groundYLocal,
  useBakedTextures = false
) {
  const boneMat = createSmithsonianBonePBRMaterial('ochre');
  const armatureMat = createMuseumArmatureMaterial();

  skelHolder.traverse((obj) => {
    if (!obj.isMesh) return;
    if (/platform|floor|base|pedestal|ground/i.test(obj.name)) {
      obj.visible = false;
      return;
    }
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;

    if (useBakedTextures && obj.material?.map) {
      const cloned = obj.material.clone();
      cloned.roughness = 0.58;
      cloned.metalness = 0.04;
      cloned.envMapIntensity = 0.72;
      cloned.color = new THREE.Color('#eed3ab');
      cloned.side = THREE.DoubleSide;
      obj.material = cloned;
    } else {
      obj.material = boneMat;
    }
  });

  const size = skelBox.getSize(new THREE.Vector3());
  const center = skelBox.getCenter(new THREE.Vector3());
  const min = skelBox.min;
  const lenSize = Math.max(0.5, size.x);
  const heightSize = Math.max(0.5, size.y);
  const id = species?.id || '';

  const addonGroup = new THREE.Group();
  addonGroup.name = `MuseumAddons_${id}`;

  const rodR = Math.max(0.010, lenSize * 0.0048);
  const hipPt = new THREE.Vector3(
    min.x + lenSize * (useBakedTextures ? 0.36 : 0.52),
    min.y + heightSize * (useBakedTextures ? 0.42 : 0.52),
    center.z
  );
  const chestPt = new THREE.Vector3(
    min.x + lenSize * (useBakedTextures ? 0.62 : 0.68),
    min.y + heightSize * (useBakedTextures ? 0.38 : 0.48),
    center.z
  );
  addonGroup.add(
    buildArmatureSupportRod(groundYLocal, hipPt, rodR, armatureMat),
    buildArmatureSupportRod(groundYLocal, chestPt, rodR, armatureMat)
  );

  skelHolder.add(addonGroup);
  return addonGroup;
}

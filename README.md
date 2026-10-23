# DinoVerse 3D — Interactive Prehistoric Dinosaur & Paleo-Earth Portal

**Live Portal:** [https://dino-portal-3d.web.app](https://dino-portal-3d.web.app)

An interactive, offline-ready 3D educational portal for kids, students, and paleontology enthusiasts exploring **74 prehistoric species across all 6 geological eras** (from 298 MYA Permian Synapsid Precursors to the 66 MYA Chicxulub Impact & Avian Dinosaur Survivors).

## Key Educational & Technical Features

1. **Real 3D Photogrammetry & Skeletal-Rigged `.glb` Models (`src/engine/RealDinoLoader.js`)**
   - **28 real high-poly 3D `.glb` meshes** (including *Tyrannosaurus rex*, *Triceratops*, *Stegosaurus*, *Kentrosaurus*, *Brachiosaurus / Paluxysaurus*, *Spinosaurus*, *Velociraptor*, *Ankylosaurus*, *Parasaurolophus*, *Carnotaurus*, *Allosaurus*, *Pteranodon*, *Mosasaurus*, *Plesiosaurus*, *Ichthyosaurus*, *Quetzalcoatlus*, *Dimetrodon*, *Archaeopteryx*, and more) mapped across all 74 species with real skeletal `AnimationMixer` keyframe animations (`Idle`, `Walk`, `Sprint`, and species signature actions) plus species-specific morphology adaptations and skin tinting.

2. **3-Layer 3D Anatomical X-Ray & Fossil Dissection (`RealDinoLoader.js` + `DinoBiomechanicsEngine.js`)**
   - **`🦎 Skin & Feathers`**: Real PBR albedo, normal, roughness, and species counter-shaded pigmentation with feather plumage and osteoderm armor.
   - **`🫀 Muscles & Beating Heart`**: Anatomically mapped 3D myology shader computed from each mesh's 16-slice dorsal-to-ventral geometric envelope (`computeRealGLBThoraxBounds`), featuring striated muscle bundles, white epimysium/aponeurosis tendons, a beating 4-chambered archosaur heart with glowing ventricles/atria and avian air-sac lungs inside the anterior ribcage, plus a pulsating arterial/venous vascular tree (dorsal aorta, vena cava, carotid/jugular, intercostal, segmental caudal, and femoral/brachial vessels) that sends systolic pressure waves from the heart to the tail and limbs.
   - **`🦴 Fossil Skeleton`**: Articulated permineralized osteology view mapped to each species' true dorsal spine and ventral ribcage envelope, featuring cervical/dorsal/caudal vertebral centra, neural spines, curved thoracic ribs and gastralia, diapsid/ceratopsian skull fenestrae (`orbit`, `antorbital fenestra`, `lateral temporal fenestra`, and `parietosquamosal frill fenestrae`), hollow limb bone shafts with epiphyseal joints, and preserved keratinous horns, beaks, teeth, and osteoderm plates.

3. **Dual-Mode 3D WebGL Engine (`src/engine/DinoWorldEngine.js`)**
   - **3D Dino Anatomy Lab (`360° Turntable`)**: Inspect any of the 74 species up close with interactive 3D anatomical hotspots, locomotion speed controls, and live camera framing.
   - **3D Era Habitat Time-Portal (`6 Eras`)**: Fly through 6 multi-specimen 3D dioramas with dynamic paleo-atmospheric skies, ginkgos, cycads, conifers, and volcanic ash.

4. **Human & School Bus Scale Comparator**
   - Toggle a 3D **10-Year-Old Kid (1.4 m)**, **Adult Paleontologist (1.8 m)**, and **Yellow School Bus (11.0 m)** right beside the dinosaur in the 3D scene and in the 2D scale comparison chart.

5. **Living Soundscape & Bio-Acoustic Synthesizer (`src/audio/BioAcousticAudio.js`)**
   - **12 species-specific procedural calls** built from formant filter banks, roughness modulation, breath noise, and outdoor convolution reverb (*T. rex* 42 Hz closed-mouth infrasonic boom, sauropod bellows, *Diplodocus* supersonic tail-whip crack, *Parasaurolophus* 148 Hz hollow-crest resonance, dromaeosaur shrieks, pterosaur screeches, and underwater sonar click-trains).
   - **Read-Aloud Narrator**: Supports Google Cloud Text-to-Speech **Chirp 3 HD** voices via `server.py` (`/api/tts`) with automatic fallback to browser Web Speech API voices on static hosting.

6. **Paleo-Earth Continental Drift Lab, Chicxulub Impact Simulator & Dino Quiz**
   - Interactive continental drift globe (**Pangaea → Laurasia/Gondwana → Modern Continents**), atmospheric $O_2$ / $CO_2$ / global temperature telemetry, fossil discovery map pins, **66 MYA Chicxulub Asteroid Impact Simulator**, and **Junior Paleontologist Field Quiz**.

## Running Locally

```bash
python3 server.py 8092
```

Then open `http://127.0.0.1:8092` in your browser.

import { ERAS, SPECIES, QUIZ_QUESTIONS } from './data/dinosaurs.js';
import { DinoWorldEngine } from './engine/DinoWorldEngine.js';
import { renderContinentalDriftTexture } from './engine/HyperRealKit.js';
import { BioAcousticAudio, CHIRP_VOICE_PRESETS } from './engine/BioAcousticAudio.js';

/**
 * main.js — Safe DOM Controller for DinoVerse 3D.
 * Built strictly with createElement / textContent / replaceChildren (zero innerHTML).
 */

const discoveredSpecies = new Set(['tyrannosaurus-rex']);
let currentFilter = 'all';
let currentSearch = '';
let activeHotspotIndex = -1;

const audio = new BioAcousticAudio();

// DOM Elements
const canvas = document.getElementById('dino-canvas');
const hotspotOverlay = document.getElementById('hotspot-overlay');
const passportCounter = document.getElementById('passport-counter');
const eraTabsNav = document.getElementById('era-tabs-nav');
const speciesRosterList = document.getElementById('species-roster-list');
const searchInput = document.getElementById('species-search-input');
const dietFilterBar = document.getElementById('diet-filter-bar');

const miniEarthEraLabel = document.getElementById('mini-earth-era-label');
const miniEarthClimateBadge = document.getElementById('mini-earth-climate-badge');
const miniDriftCanvas = document.getElementById('mini-drift-canvas');
const miniEarthPinCaption = document.getElementById('mini-earth-pin-caption');

const modeBtnLab = document.getElementById('mode-btn-lab');
const modeBtnPortal = document.getElementById('mode-btn-portal');
const bannerEraName = document.getElementById('banner-era-name');
const bannerEraFlora = document.getElementById('banner-era-flora');
const whatifToast = document.getElementById('whatif-toast');

const btnToggleScale = document.getElementById('btn-toggle-scale');
const btnResetCamera = document.getElementById('btn-reset-camera');
const btnPlayRoar = document.getElementById('btn-play-roar');
const btnPlayFootsteps = document.getElementById('btn-play-footsteps');
const btnNarrateStory = document.getElementById('btn-narrate-story');
const btnTriggerWhatif = document.getElementById('btn-trigger-whatif');

const btnToggleAmbience = document.getElementById('btn-toggle-ambience');
const btnToggleBackdrop = document.getElementById('btn-toggle-backdrop');
const narratorVoiceSelect = document.getElementById('narrator-voice-select');
const narratorVoiceStatus = document.getElementById('narrator-voice-status');

// Inspector Elements
const inspEraBadge = document.getElementById('insp-era-badge');
const inspDietBadge = document.getElementById('insp-diet-badge');
const inspStanceBadge = document.getElementById('insp-stance-badge');
const inspName = document.getElementById('insp-name');
const inspScientific = document.getElementById('insp-scientific');
const inspPronunciation = document.getElementById('insp-pronunciation');
const inspMeaning = document.getElementById('insp-meaning');
const metricLength = document.getElementById('metric-length');
const metricHeight = document.getElementById('metric-height');
const metricWeight = document.getElementById('metric-weight');
const metricSpeedBite = document.getElementById('metric-speed-bite');
const scaleBarsContainer = document.getElementById('scale-bars-container');
const inspStory = document.getElementById('insp-story');
const inspHotspotsList = document.getElementById('insp-hotspots-list');
const inspFactsList = document.getElementById('insp-facts-list');
const inspDiscoveryText = document.getElementById('insp-discovery-text');

// -----------------------------------------------------------------------------
// 0. LIVING SOUNDSCAPE — creatures call, stomp and breathe on their own
// -----------------------------------------------------------------------------
let greetingTimer = null;

/** Every vocalization (button, greeting, idle, distant) drives the 3D jaw / head of the caller. */
audio.onVocalize = (species, duration, kind, delay = 0) => {
  if (kind === 'distant') return;
  engine.vocalize(species.id, duration, delay);
};

function refreshSoundscape() {
  const species = engine.activeSpecies;
  const era = ERAS.find((e) => e.id === species?.eraId);
  if (!audio.unlocked || !audio.ambienceEnabled || engine.viewMode !== 'lab') {
    audio.stopAmbience();
    audio.stopIdleCalls();
    return;
  }
  audio.startAmbience(era, species, engine.getEraNeighbours());
  audio.startIdleCalls(() => engine.activeSpecies);
}

function greetWithCall(species) {
  if (!audio.unlocked || !audio.ambienceEnabled || audio.isSpeaking) return;
  if (greetingTimer) clearTimeout(greetingTimer);
  greetingTimer = setTimeout(() => {
    greetingTimer = null;
    if (engine.activeSpecies?.id === species.id && engine.viewMode === 'lab') {
      audio.playGreeting(species);
    }
  }, 650);
}

// Browsers only allow sound after a user gesture: unlock on the first interaction.
const unlockAudioOnce = () => {
  if (audio.unlock()) {
    window.removeEventListener('pointerdown', unlockAudioOnce);
    window.removeEventListener('keydown', unlockAudioOnce);
    refreshSoundscape();
  }
};
window.addEventListener('pointerdown', unlockAudioOnce);
window.addEventListener('keydown', unlockAudioOnce);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.stopAmbience();
    audio.stopIdleCalls();
  } else {
    refreshSoundscape();
  }
});

// 3D backdrop: light by default; a saved choice is applied to <html data-backdrop> pre-paint by
// src/backdrop-boot.js, so we start the engine from that attribute.
const BACKDROP_STORAGE_KEY = 'dinoverse-backdrop'; // must match src/backdrop-boot.js
const initialBackdrop = document.documentElement.dataset.backdrop === 'dark' ? 'dark' : 'light';

// Initialize 3D Engine
const engine = new DinoWorldEngine(canvas, ERAS, SPECIES, {
  onSpeciesChange: (species, era) => {
    discoveredSpecies.add(species.id);
    activeHotspotIndex = -1;
    updatePassportCounter();
    updateEraTabsUI(era.id);
    updateRosterActiveState(species.id);
    updateInspectorPanel(species, era);
    updateMiniPaleoEarth(species, era);
    rebuildFloatingHotspotPins(species);
    refreshSoundscape();
    greetWithCall(species);
  },
  onEraChange: (era) => {
    updateEraTabsUI(era.id);
    updateEraBanner(era);
  },
  onModeChange: (mode) => {
    modeBtnLab.classList.toggle('active', mode === 'lab');
    modeBtnLab.setAttribute('aria-selected', String(mode === 'lab'));
    modeBtnPortal.classList.toggle('active', mode === 'portal');
    modeBtnPortal.setAttribute('aria-selected', String(mode === 'portal'));
    hotspotOverlay.classList.toggle('hidden', mode !== 'lab');
    refreshSoundscape();
  },
  onStep: (species, foot, intensity, locomotion) => {
    if (!audio.unlocked || !audio.ambienceEnabled || audio.isSpeaking) return;
    if (locomotion === 'fly') {
      audio.playWingFlap(species, intensity * 0.7);
    } else {
      audio.playFootstep(species, { intensity: intensity * (engine.whatIfActive ? 1.0 : 0.6) });
    }
  },
  onFrame: () => {
    updateFloatingHotspotPositions();
  },
}, { backdropTheme: initialBackdrop });

function updatePassportCounter() {
  // "Discovered" lives in a .lbl-long span so narrow screens can drop it (same text on desktop).
  const suffix = document.createElement('span');
  suffix.className = 'lbl-long';
  suffix.textContent = ' Discovered';
  passportCounter.replaceChildren(`🦴 ${discoveredSpecies.size} / ${SPECIES.length}`, suffix);
}

// -----------------------------------------------------------------------------
// 1. TOP ERA TABS NAVIGATION
// -----------------------------------------------------------------------------
function renderEraTabs() {
  eraTabsNav.replaceChildren();
  ERAS.forEach((era) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'era-tab-btn';
    btn.dataset.eraId = era.id;

    const topSpan = document.createElement('span');
    topSpan.className = 'era-tab-top';
    topSpan.textContent = `${era.number}. ${era.name}`;

    const subSpan = document.createElement('span');
    subSpan.className = 'era-tab-sub';
    subSpan.textContent = era.timeRange;

    btn.appendChild(topSpan);
    btn.appendChild(subSpan);

    btn.addEventListener('click', () => {
      engine.selectEra(era.id);
    });

    eraTabsNav.appendChild(btn);
  });
}

function updateEraTabsUI(activeEraId) {
  const buttons = eraTabsNav.querySelectorAll('.era-tab-btn');
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.eraId === activeEraId);
  });
  const era = ERAS.find((e) => e.id === activeEraId);
  if (era) {
    updateEraBanner(era);
  }
}

function updateEraBanner(era) {
  const range = document.createElement('span');
  range.className = 'lbl-long';
  range.textContent = ` (${era.timeRange})`;
  bannerEraName.replaceChildren(era.name, range);
  bannerEraFlora.textContent = era.flora;
}

// -----------------------------------------------------------------------------
// 2. LEFT PANEL: 29-SPECIES ROSTER & FILTERS
// -----------------------------------------------------------------------------
function getFilteredSpecies() {
  return SPECIES.filter((sp) => {
    if (currentFilter === 'Carnivore' && sp.diet !== 'Carnivore') return false;
    if (currentFilter === 'Herbivore' && sp.diet !== 'Herbivore' && sp.diet !== 'Omnivore') return false;
    if (currentFilter === 'Ocean' && sp.domain !== 'Ocean' && sp.domain !== 'Semi-Aquatic') return false;
    if (currentFilter === 'Sky' && sp.domain !== 'Sky') return false;

    if (currentSearch.trim() !== '') {
      const q = currentSearch.toLowerCase();
      const hay = `${sp.name} ${sp.scientificName} ${sp.meaning} ${sp.eraId} ${sp.clade}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderSpeciesRoster() {
  speciesRosterList.replaceChildren();
  const list = getFilteredSpecies();

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'story-paragraph';
    empty.textContent = 'No prehistoric species match your search filter.';
    speciesRosterList.appendChild(empty);
    return;
  }

  list.forEach((sp) => {
    const era = ERAS.find((e) => e.id === sp.eraId);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'species-card-item';
    if (engine.activeSpecies?.id === sp.id) {
      btn.classList.add('active');
    }
    btn.dataset.speciesId = sp.id;

    const topRow = document.createElement('div');
    topRow.className = 'species-card-top';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'species-card-name';
    const icon =
      sp.domain === 'Ocean'
        ? '🌊 '
        : sp.domain === 'Sky'
        ? '🦅 '
        : sp.diet === 'Carnivore'
        ? '🥩 '
        : '🌿 ';
    nameSpan.textContent = `${icon}${sp.name}`;

    const eraDot = document.createElement('span');
    eraDot.className = 'species-card-era-dot';
    eraDot.textContent = `${sp.paleoMa} MYA`;
    if (era) {
      eraDot.style.color = era.themeColor;
    }

    topRow.appendChild(nameSpan);
    topRow.appendChild(eraDot);

    const metaRow = document.createElement('div');
    metaRow.className = 'species-card-meta';
    const leftMeta = document.createElement('span');
    leftMeta.textContent = era ? era.name : sp.periodLabel;
    const rightMeta = document.createElement('span');
    rightMeta.textContent = `${sp.metrics.lengthM}m • ${sp.diet}`;
    metaRow.appendChild(leftMeta);
    metaRow.appendChild(rightMeta);

    btn.appendChild(topRow);
    btn.appendChild(metaRow);

    btn.addEventListener('click', () => {
      engine.selectSpecies(sp.id);
      closeMobileSheet(); // phones: drop the sheet so the chosen dinosaur is visible
    });

    speciesRosterList.appendChild(btn);
  });
}

function updateRosterActiveState(activeSpeciesId) {
  const cards = speciesRosterList.querySelectorAll('.species-card-item');
  cards.forEach((card) => {
    const isMatch = card.dataset.speciesId === activeSpeciesId;
    card.classList.toggle('active', isMatch);
    if (isMatch) {
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

// -----------------------------------------------------------------------------
// 3. RIGHT INSPECTOR PANEL & 2D SCALE COMPARATOR
// -----------------------------------------------------------------------------
function updateInspectorPanel(sp, era) {
  inspEraBadge.textContent = sp.periodLabel;
  if (era) {
    inspEraBadge.style.borderColor = era.themeColor;
    inspEraBadge.style.color = era.themeColor;
  }
  inspDietBadge.textContent = `${sp.diet === 'Carnivore' ? '🥩' : sp.diet === 'Piscivore' ? '🐟' : '🌿'} ${sp.diet}`;
  inspStanceBadge.textContent = `${sp.stance} (${sp.domain})`;

  inspName.textContent = sp.name;
  inspScientific.textContent = sp.scientificName;
  inspPronunciation.textContent = `🔊 ${sp.pronunciation}`;
  inspMeaning.textContent = `Meaning: ${sp.meaning} • Clade: ${sp.clade}`;

  const feetLen = Math.round(sp.metrics.lengthM * 3.28084);
  const feetH = Math.round(sp.metrics.heightM * 3.28084);
  metricLength.textContent = `${sp.metrics.lengthM} m (${feetLen} ft)`;
  metricHeight.textContent = `${sp.metrics.heightM} m (${feetH} ft)`;
  metricWeight.textContent = sp.metrics.weightLabel;
  metricSpeedBite.textContent = `${sp.metrics.speedKmh} km/h • ${sp.metrics.biteForceN.toLocaleString()} N`;

  btnTriggerWhatif.textContent = sp.whatIfLabel || '⚡ Unleash Apex Action';
  whatifToast.classList.add('hidden');

  render2DScaleComparison(sp);

  inspStory.textContent = sp.story;

  // Render 3 Clickable Anatomical Hotspots
  inspHotspotsList.replaceChildren();
  (sp.hotspots || []).forEach((hs, idx) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hotspot-detail-card';
    card.dataset.hsIndex = String(idx);

    const title = document.createElement('div');
    title.className = 'hotspot-card-title';
    title.textContent = `${idx + 1}. ${hs.title}`;

    const bone = document.createElement('div');
    bone.className = 'hotspot-card-bone';
    bone.textContent = `🦴 Anatomy: ${hs.organOrBone}`;

    const desc = document.createElement('div');
    desc.className = 'hotspot-card-desc';
    desc.textContent = hs.detail;

    card.appendChild(title);
    card.appendChild(bone);
    card.appendChild(desc);

    card.addEventListener('click', () => {
      selectHotspot(idx);
      closeMobileSheet(); // phones: reveal the camera zoom on that body part
    });

    inspHotspotsList.appendChild(card);
  });

  // Render Fun Facts
  inspFactsList.replaceChildren();
  (sp.funFacts || []).forEach((fact) => {
    const li = document.createElement('li');
    li.textContent = fact;
    inspFactsList.appendChild(li);
  });

  // Discovery Passport
  const d = sp.discovery;
  inspDiscoveryText.textContent = d
    ? `Unearthed at ${d.location} (${d.country}) in the ${d.formation} (${d.year}) by ${d.paleontologist}.`
    : 'Global fossil record.';
}

function render2DScaleComparison(sp) {
  scaleBarsContainer.replaceChildren();
  const maxRef = Math.max(14.0, sp.metrics.lengthM);
  const comparisons = [
    { label: `🦖 ${sp.name}`, meters: sp.metrics.lengthM, color: '#f59e0b' },
    { label: '🧒 10-Yr-Old Kid (Height)', meters: 1.4, color: '#38bdf8' },
    { label: '🧑‍🔬 Adult Human (Height)', meters: 1.8, color: '#10b981' },
    { label: '🚌 School Bus (Length)', meters: 11.0, color: '#eab308' },
  ];

  comparisons.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'scale-bar-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'scale-bar-label-row';
    const left = document.createElement('span');
    left.textContent = item.label;
    const right = document.createElement('span');
    right.textContent = `${item.meters} m`;
    labelRow.appendChild(left);
    labelRow.appendChild(right);

    const track = document.createElement('div');
    track.className = 'scale-bar-track';
    const fill = document.createElement('div');
    fill.className = 'scale-bar-fill';
    fill.style.width = `${Math.max(4, Math.min(100, (item.meters / maxRef) * 100))}%`;
    fill.style.backgroundColor = item.color;
    track.appendChild(fill);

    row.appendChild(labelRow);
    row.appendChild(track);
    scaleBarsContainer.appendChild(row);
  });
}

// -----------------------------------------------------------------------------
// 4. FLOATING 3D ANATOMICAL HOTSPOT PINS
// -----------------------------------------------------------------------------
let hotspotPinElements = [];

function rebuildFloatingHotspotPins(sp) {
  hotspotOverlay.replaceChildren();
  hotspotPinElements = [];
  (sp.hotspots || []).forEach((hs, idx) => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'hotspot-pin-btn';

    const num = document.createElement('span');
    num.className = 'hotspot-pin-num';
    num.textContent = String(idx + 1);

    const text = document.createElement('span');
    text.textContent = hs.title;

    pin.appendChild(num);
    pin.appendChild(text);

    pin.addEventListener('click', () => {
      selectHotspot(idx);
    });

    hotspotOverlay.appendChild(pin);
    hotspotPinElements.push(pin);
  });
}

function updateFloatingHotspotPositions() {
  if (engine.viewMode !== 'lab') return;
  const projected = engine.getProjectedHotspots();
  hotspotPinElements.forEach((el, idx) => {
    const match = projected.find((p) => p.index === idx);
    if (!match) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';
    el.style.left = `${Math.round(match.x)}px`;
    el.style.top = `${Math.round(match.y)}px`;
  });
}

function selectHotspot(idx) {
  activeHotspotIndex = idx;
  engine.setViewMode('lab');
  engine.focusOnHotspot(idx);

  const cards = inspHotspotsList.querySelectorAll('.hotspot-detail-card');
  cards.forEach((c, cIdx) => {
    c.classList.toggle('active', cIdx === idx);
    if (cIdx === idx) {
      c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  const hs = engine.activeSpecies?.hotspots?.[idx];
  if (hs) {
    whatifToast.textContent = `🔬 ${hs.title}: ${hs.detail}`;
    whatifToast.classList.remove('hidden');
  }
}

// -----------------------------------------------------------------------------
// 5. LIVE MINI PALEO-EARTH CONTINENTAL DRIFT TRACKER
// -----------------------------------------------------------------------------
function updateMiniPaleoEarth(sp, era) {
  miniEarthEraLabel.textContent = `🌍 ${era ? era.name : sp.periodLabel} (${sp.paleoMa} MYA)`;
  const c = sp.climate || { o2Pct: 26, co2Ppm: 1400, tempC: 21 };
  miniEarthClimateBadge.textContent = `O₂ ${c.o2Pct}% • CO₂ ${c.co2Ppm}ppm • +${c.tempC}°C`;
  miniEarthPinCaption.textContent = `🦴 ${sp.discovery?.location || 'Global'}, ${sp.discovery?.country || ''}`;

  renderContinentalDriftTexture(sp.paleoMa, {
    canvas: miniDriftCanvas,
    width: 420,
    height: 210,
    mapPin: sp.discovery?.mapPin,
    pinLabel: sp.name,
  });
}

// -----------------------------------------------------------------------------
// 5b. PHONES & TABLETS: SPECIES LIST AND FIELD GUIDE AS BOTTOM SHEETS
// -----------------------------------------------------------------------------
// At <= 1024px (matches the styles.css breakpoint) the two side panels become bottom sheets
// opened from a tab bar, so the dinosaur keeps most of the screen. Desktop never sets
// <body data-mobile-sheet>, so its three-column layout is untouched.
const SHEET_LAYOUT_QUERY = window.matchMedia('(max-width: 1024px)');
const sheetToggles = {
  roster: document.getElementById('btn-mobile-sheet-roster'),
  guide: document.getElementById('btn-mobile-sheet-guide'),
};
const sheetPanels = {
  roster: document.getElementById('roster-panel'),
  guide: document.getElementById('inspector-panel'),
};

function setMobileSheet(name) {
  const previous = document.body.dataset.mobileSheet || '';
  const open = (name === 'roster' || name === 'guide') && SHEET_LAYOUT_QUERY.matches ? name : '';
  if (open) {
    document.body.dataset.mobileSheet = open;
  } else {
    delete document.body.dataset.mobileSheet;
  }
  Object.entries(sheetToggles).forEach(([key, btn]) => {
    btn?.setAttribute('aria-expanded', String(key === open));
    btn?.classList.toggle('active', key === open);
  });
  // Keyboard/screen-reader users land inside the sheet, and back on its tab when it closes.
  if (open) {
    sheetPanels[open]?.querySelector('.sheet-close-btn')?.focus({ preventScroll: true });
  } else if (previous && sheetPanels[previous]?.contains(document.activeElement)) {
    sheetToggles[previous]?.focus({ preventScroll: true });
  }
}

function closeMobileSheet() {
  if (document.body.dataset.mobileSheet) setMobileSheet('');
}

Object.entries(sheetToggles).forEach(([key, btn]) => {
  btn?.addEventListener('click', () => {
    setMobileSheet(document.body.dataset.mobileSheet === key ? '' : key);
  });
});
document.querySelectorAll('[data-close-sheet]').forEach((btn) => {
  btn.addEventListener('click', closeMobileSheet);
});
// Rotating a tablet / widening a window into the desktop layout must not leave a sheet state behind.
if (typeof SHEET_LAYOUT_QUERY.addEventListener === 'function') {
  SHEET_LAYOUT_QUERY.addEventListener('change', closeMobileSheet);
} else if (typeof SHEET_LAYOUT_QUERY.addListener === 'function') {
  SHEET_LAYOUT_QUERY.addListener(closeMobileSheet); // Safari < 14
}

// Captions (roar, hotspot, apex action…) sit over the 3D view: a tap dismisses them.
whatifToast.addEventListener('click', () => whatifToast.classList.add('hidden'));

// -----------------------------------------------------------------------------
// 6. INTERACTIVE CONTROLS & BIO-ACOUSTIC TRIGGERS
// -----------------------------------------------------------------------------
searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value || '';
  renderSpeciesRoster();
});

dietFilterBar.querySelectorAll('.filter-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    dietFilterBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter || 'all';
    renderSpeciesRoster();
  });
});

modeBtnLab.addEventListener('click', () => engine.setViewMode('lab'));
modeBtnPortal.addEventListener('click', () => engine.setViewMode('portal'));

document.querySelectorAll('.layer-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.layer-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const layer = btn.dataset.layer || 'skin';
    engine.setAnatomyLayer(layer);
  });
});

btnToggleScale.addEventListener('click', () => {
  const next = !engine.showScaleComparator;
  engine.setViewMode('lab');
  engine.setScaleComparatorVisible(next);
  btnToggleScale.setAttribute('aria-pressed', String(next));
  if (next) {
    whatifToast.textContent = `📏 3D Scale Active: Blue = 10-Yr-Old Kid (1.4m), Green = Adult (1.8m), Yellow = School Bus (11m) vs. ${engine.activeSpecies.name} (${engine.activeSpecies.metrics.lengthM}m)!`;
    whatifToast.classList.remove('hidden');
  } else {
    whatifToast.classList.add('hidden');
  }
});

btnResetCamera.addEventListener('click', () => {
  engine.resetCamera();
  whatifToast.classList.add('hidden');
});

btnPlayRoar.addEventListener('click', () => {
  audio.unlock();
  audio.playRoar(engine.activeSpecies, { intensity: 1.0, kind: 'button' });
  whatifToast.textContent = `🔊 ${engine.activeSpecies.name}: ${engine.activeSpecies.vocalProfile?.description || 'Prehistoric vocal call'}`;
  whatifToast.classList.remove('hidden');
});

btnPlayFootsteps.addEventListener('click', () => {
  audio.unlock();
  audio.playFootsteps(engine.activeSpecies);
  whatifToast.textContent = `🐾 Seismic Footstep Simulation: ${engine.activeSpecies.metrics.weightLabel} at ${engine.activeSpecies.metrics.speedKmh} km/h!`;
  whatifToast.classList.remove('hidden');
});

const NARRATE_IDLE_LABEL = '🗣️ Read Aloud for Kids';
function setNarrationButtonState(speaking, phase, narrationEngine) {
  btnNarrateStory.classList.toggle('bio-btn--busy', speaking && phase === 'loading');
  btnNarrateStory.classList.toggle('bio-btn--speaking', speaking && phase === 'playing');
  if (!speaking) {
    btnNarrateStory.textContent = NARRATE_IDLE_LABEL;
  } else if (phase === 'loading') {
    btnNarrateStory.textContent = narrationEngine === 'chirp' ? '⏳ Warming up Chirp 3 HD voice…' : '⏳ Preparing voice…';
  } else {
    btnNarrateStory.textContent = narrationEngine === 'chirp' ? '⏹️ Stop Narration (Chirp 3 HD)' : '⏹️ Stop Narration (device voice)';
  }
}

btnNarrateStory.addEventListener('click', () => {
  audio.unlock();
  if (audio.isSpeaking) {
    audio.stopNarration(() => setNarrationButtonState(false, 'idle'));
    return;
  }
  const sp = engine.activeSpecies;
  const fullSpeech = `${sp.name}, scientific name ${sp.scientificName}, meaning ${sp.meaning}. It lived during the ${sp.periodLabel}. ${sp.story} Fun fact: ${sp.funFacts?.[0] || ''}`;
  audio.narrateText(fullSpeech, setNarrationButtonState);
});

btnTriggerWhatif.addEventListener('click', () => {
  audio.unlock();
  const active = engine.toggleWhatIf();
  if (active) {
    audio.playRoar(engine.activeSpecies, { intensity: 1.3, kind: 'apex' });
    whatifToast.textContent = `⚡ ${engine.activeSpecies.whatIfOutcome}`;
    whatifToast.classList.remove('hidden');
    if (engine.activeSpecies.id === 'chicxulub-avian-survivor') {
      openImpactModal();
      audio.playImpactBoom();
    }
  } else {
    whatifToast.classList.add('hidden');
  }
});

// Living soundscape toggle (auto calls, footsteps, era ambience)
function renderAmbienceToggle() {
  const on = audio.ambienceEnabled;
  btnToggleAmbience.setAttribute('aria-pressed', String(on));
  btnToggleAmbience.textContent = on ? '🔈 Living Soundscape: On' : '🔇 Living Soundscape: Off';
}
btnToggleAmbience.addEventListener('click', () => {
  audio.unlock();
  audio.setAmbienceEnabled(!audio.ambienceEnabled);
  renderAmbienceToggle();
  refreshSoundscape();
  if (audio.ambienceEnabled) greetWithCall(engine.activeSpecies);
});
renderAmbienceToggle();

// Light / dark 3D backdrop toggle (light by default; the visitor's choice is remembered)
function renderBackdropToggle(backdrop) {
  if (!btnToggleBackdrop) return;
  const next = backdrop === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} 3D backdrop`;
  btnToggleBackdrop.textContent = next === 'dark' ? '🌙' : '☀️';
  btnToggleBackdrop.setAttribute('aria-label', label);
  btnToggleBackdrop.title = label;
}
btnToggleBackdrop?.addEventListener('click', () => {
  const backdrop = engine.setBackdropTheme(engine.backdropTheme === 'dark' ? 'light' : 'dark');
  document.documentElement.dataset.backdrop = backdrop;
  try {
    localStorage.setItem(BACKDROP_STORAGE_KEY, backdrop);
  } catch {
    // Storage unavailable (privacy mode): the choice still applies for this visit.
  }
  renderBackdropToggle(backdrop);
});
renderBackdropToggle(engine.backdropTheme);

// Narrator voice picker: Google Cloud Chirp 3 HD voices (via the local proxy) or the device voice
function renderVoicePicker(status) {
  narratorVoiceSelect.replaceChildren();
  const chirpAvailable = Boolean(status?.available);
  if (chirpAvailable) {
    const allowed = new Set(status.voices || []);
    CHIRP_VOICE_PRESETS.filter((v) => allowed.size === 0 || allowed.has(v.id)).forEach((preset) => {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = preset.label;
      narratorVoiceSelect.appendChild(opt);
    });
  }
  const deviceOpt = document.createElement('option');
  deviceOpt.value = 'device';
  deviceOpt.textContent = chirpAvailable ? 'Device voice (offline fallback)' : 'Device voice (offline)';
  narratorVoiceSelect.appendChild(deviceOpt);

  const wanted = audio.narrationMode === 'device' || !chirpAvailable ? 'device' : audio.voiceName;
  narratorVoiceSelect.value = wanted;
  if (narratorVoiceSelect.value !== wanted) {
    narratorVoiceSelect.selectedIndex = 0;
  }
  audio.setVoice(narratorVoiceSelect.value);

  narratorVoiceStatus.classList.toggle('voice-status--ok', chirpAvailable);
  narratorVoiceStatus.classList.toggle('voice-status--fallback', !chirpAvailable);
  narratorVoiceStatus.textContent = chirpAvailable
    ? '✓ Google Chirp 3 HD ready'
    : 'Chirp 3 HD unavailable — using device voice';
}
narratorVoiceSelect.addEventListener('change', () => {
  audio.setVoice(narratorVoiceSelect.value);
  if (audio.isSpeaking) {
    audio.stopNarration(() => setNarrationButtonState(false, 'idle'));
  }
});
audio.getTtsStatus().then(renderVoicePicker);

// -----------------------------------------------------------------------------
// 7. MODAL 1: PALEO-EARTH CONTINENTAL DRIFT LAB (285 MYA → TODAY)
// -----------------------------------------------------------------------------
const driftModal = document.getElementById('drift-modal');
const driftMaSlider = document.getElementById('drift-ma-slider');
const driftMaReadout = document.getElementById('drift-ma-readout');
const largeDriftCanvas = document.getElementById('large-drift-canvas');
const driftExplanationText = document.getElementById('drift-explanation-text');

function getEraDescriptionForMa(ma) {
  if (ma >= 250) {
    return `${ma} MYA (Permian Period): All continents are fused into Supercontinent Pangaea surrounded by the global Panthalassic Ocean. Sail-backed Dimetrodon and saber-toothed Gorgonopsids rule the red-bed deserts.`;
  }
  if (ma >= 201) {
    return `${ma} MYA (Triassic Period): Pangaea starts stretching along volcanic rift valleys. Early nimble bipedal dinosaurs (Eoraptor, Coelophysis, Herrerasaurus) and prosauropods (Plateosaurus) emerge!`;
  }
  if (ma >= 145) {
    return `${ma} MYA (Jurassic Period): The Central Atlantic Ocean opens, splitting Pangaea into northern Laurasia and southern Gondwana! Warm humid conifer forests feed 50-ton Brachiosaurus, Diplodocus, and Stegosaurus.`;
  }
  if (ma >= 90) {
    return `${ma} MYA (Early & Mid Cretaceous): South America and Africa rift apart as the South Atlantic opens, and the first flowering plants bloom! Spinosaurus hunts in North African river deltas while 75-ton Argentinosaurus walks Patagonia.`;
  }
  if (ma >= 66) {
    return `${ma} MYA (Late Cretaceous): High sea levels flood central North America to form the Western Interior Seaway! T-Rex, Triceratops, and Ankylosaurus roam Laramidia while 17-meter Mosasaurus rules the inland sea.`;
  }
  if (ma >= 25) {
    return `${ma} MYA (Cenozoic Era): After the 66 MYA Chicxulub asteroid impact, India collides northward into Eurasia to push up the Himalaya Mountains while birds and mammals diversify!`;
  }
  return `${ma} MYA (Modern Earth): Today's 7 continents! Look up in the sky—over 11,000 species of feathered avian theropod dinosaurs (birds) still thrive on every continent from the Amazon to Antarctica!`;
}

function updateLargeDriftLab(ma) {
  const numMa = Number(ma);
  driftMaSlider.value = String(numMa);
  driftMaReadout.textContent = `${numMa} Million Years Ago`;
  driftExplanationText.textContent = getEraDescriptionForMa(numMa);

  renderContinentalDriftTexture(numMa, {
    canvas: largeDriftCanvas,
    width: 960,
    height: 460,
    mapPin: engine.activeSpecies?.discovery?.mapPin,
    pinLabel: `${engine.activeSpecies?.name} Fossil Site`,
  });
}

document.getElementById('btn-open-drift-modal').addEventListener('click', () => {
  driftModal.classList.remove('hidden');
  updateLargeDriftLab(engine.activeSpecies?.paleoMa ?? 152);
});

document.getElementById('btn-close-drift-modal').addEventListener('click', () => {
  driftModal.classList.add('hidden');
});

driftMaSlider.addEventListener('input', (e) => {
  updateLargeDriftLab(e.target.value);
});

document.querySelectorAll('.preset-ma-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    updateLargeDriftLab(btn.dataset.ma);
  });
});

// -----------------------------------------------------------------------------
// 8. MODAL 2: CHICXULUB ASTEROID IMPACT & AVIAN SURVIVAL SIMULATOR
// -----------------------------------------------------------------------------
const impactModal = document.getElementById('impact-modal');
const impactSlider = document.getElementById('impact-stage-slider');
const impactReadout = document.getElementById('impact-stage-readout');
const impactCanvas = document.getElementById('impact-sim-canvas');
const impactExplanation = document.getElementById('impact-explanation-text');

function renderChicxulubSimulation(val) {
  const v = Number(val);
  impactSlider.value = String(v);
  const ctx = impactCanvas.getContext('2d');
  const w = impactCanvas.width;
  const h = impactCanvas.height;

  // Base Paleo-Earth at 66 MYA
  renderContinentalDriftTexture(v > 80 ? 0 : 66, {
    canvas: impactCanvas,
    width: w,
    height: h,
    showLabels: true,
  });

  // Yucatán Chicxulub coordinates
  const cx = w * 0.27;
  const cy = h * 0.46;

  if (v < 25) {
    impactReadout.textContent = 'Stage 1: T-Minus 10 Seconds — 10-km Bolide Entering Atmosphere at 72,000 km/h';
    impactExplanation.textContent =
      'A carbonaceous chondrite asteroid wider than Mount Everest streaks out of space at 20 kilometers per second, glowing 10,000°C hotter than the surface of the Sun as it targets the shallow Yucatán carbonate sea.';

    // Fiery asteroid streak
    ctx.save();
    const t = v / 25;
    const ax = w * 0.05 + (cx - w * 0.05) * t;
    const ay = h * 0.05 + (cy - h * 0.05) * t;
    const grad = ctx.createLinearGradient(w * 0.05, h * 0.05, ax, ay);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.05);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ax, ay, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  } else if (v < 55) {
    impactReadout.textContent = 'Stage 2: Zero Hour — 180-km Chicxulub Crater, 100-m Mega-Tsunami & Seismic Shockwave';
    impactExplanation.textContent =
      'Impact releases 100 million megatons of energy (10 billion Hiroshima bombs)! A 180-km crater blasts molten rock into space, triggering Magnitude 11 earthquakes and a 100-meter-tall mega-tsunami across the Gulf of Mexico.';

    const progress = (v - 25) / 30;
    const ringRadius = 25 + progress * 240;

    ctx.save();
    const blastGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, ringRadius);
    blastGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    blastGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.75)');
    blastGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.35)');
    blastGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = blastGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (v < 82) {
    impactReadout.textContent = 'Stage 3: Impact Winter & K-Pg Boundary Iridium Ash Cloud (75% of Species Perish)';
    impactExplanation.textContent =
      'Sulfur aerosols and soot wrap the entire globe, blocking sunlight for years. Photosynthesis stops, collapsing the food chain for giant herbivores (Triceratops, Edmontosaurus) and giant carnivores (T-Rex, Mosasaurus).';

    ctx.save();
    ctx.fillStyle = 'rgba(30, 27, 75, 0.68)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText('☁️ Global Iridium Dust & Sulfur Impact Winter — Sunlight Blocked', w / 2, h / 2);
    ctx.restore();
  } else {
    impactReadout.textContent = 'Stage 4: 66 MYA → Today — Small Toothless Beaked Avian Dinosaurs Survive as Birds!';
    impactExplanation.textContent =
      'Why didn’t dinosaurs go 100% extinct? Small, warm-blooded, feathered avian theropods survived because their toothless keratin beaks could crack nutrient-rich buried seeds and nuts while forests recovered—giving rise to today’s 11,000+ species of living birds!';

    ctx.save();
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'center';
    ctx.fillText('🦅 11,000+ Species of Living Avian Dinosaurs (Birds) Thrive Across All 7 Continents!', w / 2, 36);
    ctx.restore();
  }
}

function openImpactModal() {
  impactModal.classList.remove('hidden');
  renderChicxulubSimulation(35);
}

document.getElementById('btn-open-impact-modal').addEventListener('click', openImpactModal);
document.getElementById('btn-close-impact-modal').addEventListener('click', () => {
  impactModal.classList.add('hidden');
});

impactSlider.addEventListener('input', (e) => {
  renderChicxulubSimulation(e.target.value);
});

document.querySelectorAll('.impact-preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    renderChicxulubSimulation(btn.dataset.val);
  });
});

// -----------------------------------------------------------------------------
// 9. MODAL 3: INTERACTIVE PALEO FIELD QUIZ
// -----------------------------------------------------------------------------
const quizModal = document.getElementById('quiz-modal');
const quizModalBody = document.getElementById('quiz-modal-body');

function renderQuizModal() {
  quizModalBody.replaceChildren();
  QUIZ_QUESTIONS.forEach((q, qIdx) => {
    const box = document.createElement('div');
    box.className = 'quiz-question-box';

    const title = document.createElement('div');
    title.className = 'quiz-q-title';
    title.textContent = `${qIdx + 1}. ${q.question}`;
    box.appendChild(title);

    const feedback = document.createElement('div');
    feedback.className = 'quiz-feedback hidden';

    q.options.forEach((optText, oIdx) => {
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.className = 'quiz-opt-btn';
      optBtn.textContent = optText;

      optBtn.addEventListener('click', () => {
        const isCorrect = oIdx === q.correctIndex;
        optBtn.classList.add(isCorrect ? 'correct' : 'wrong');
        feedback.textContent = `${isCorrect ? '✅ Correct! ' : '💡 Not quite! '}${q.explanation}`;
        feedback.classList.remove('hidden');
      });

      box.appendChild(optBtn);
    });

    box.appendChild(feedback);
    quizModalBody.appendChild(box);
  });
}

document.getElementById('btn-open-quiz-modal').addEventListener('click', () => {
  renderQuizModal();
  quizModal.classList.remove('hidden');
});

document.getElementById('btn-close-quiz-modal').addEventListener('click', () => {
  quizModal.classList.add('hidden');
});

// -----------------------------------------------------------------------------
// 10. MODAL 4: FULL 73-SPECIES PREHISTORIC ENCYCLOPEDIA ATLAS
// -----------------------------------------------------------------------------
const atlasModal = document.getElementById('atlas-modal');
const atlasGridBody = document.getElementById('atlas-grid-body');
const atlasSearchInput = document.getElementById('atlas-search-input');
const atlasEraSelect = document.getElementById('atlas-era-select');
const atlasDietSelect = document.getElementById('atlas-diet-select');
const atlasSortSelect = document.getElementById('atlas-sort-select');
const rosterCountLabel = document.getElementById('roster-count-label');

function updateDynamicCountLabels() {
  const total = SPECIES.length;
  if (rosterCountLabel) {
    rosterCountLabel.textContent = `🦕 ${total} Prehistoric Species`;
  }
  const allPill = dietFilterBar.querySelector('[data-filter="all"]');
  if (allPill) {
    allPill.textContent = `All (${total})`;
  }
  const atlasCount = document.getElementById('atlas-count');
  if (atlasCount) {
    atlasCount.textContent = String(total);
  }
}

function renderAtlasModal() {
  if (!atlasGridBody) return;
  atlasGridBody.replaceChildren();

  const q = (atlasSearchInput?.value || '').trim().toLowerCase();
  const eraFilter = atlasEraSelect?.value || 'all';
  const dietFilter = atlasDietSelect?.value || 'all';
  const sortMode = atlasSortSelect?.value || 'timeline';

  const filtered = SPECIES.filter((sp) => {
    if (eraFilter !== 'all' && sp.eraId !== eraFilter) return false;
    if (dietFilter === 'Carnivore' && sp.diet !== 'Carnivore' && sp.diet !== 'Piscivore') return false;
    if (dietFilter === 'Herbivore' && sp.diet !== 'Herbivore' && sp.diet !== 'Omnivore') return false;
    if (dietFilter === 'Ocean' && sp.domain !== 'Ocean' && sp.domain !== 'Semi-Aquatic') return false;
    if (dietFilter === 'Sky' && sp.domain !== 'Sky') return false;
    if (q !== '') {
      const hay = `${sp.name} ${sp.scientificName} ${sp.meaning} ${sp.clade} ${sp.periodLabel} ${sp.discovery?.location || ''} ${sp.discovery?.country || ''} ${sp.discovery?.formation || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sortMode === 'size-desc') {
    filtered.sort((a, b) => (b.metrics?.lengthM || 0) - (a.metrics?.lengthM || 0));
  } else if (sortMode === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  filtered.forEach((sp) => {
    const era = ERAS.find((e) => e.id === sp.eraId);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'atlas-card';
    if (engine.activeSpecies?.id === sp.id) {
      card.classList.add('active');
    }

    const head = document.createElement('div');
    head.className = 'atlas-card-head';

    const title = document.createElement('span');
    title.className = 'atlas-card-title';
    const icon =
      sp.domain === 'Ocean'
        ? '🌊 '
        : sp.domain === 'Sky'
        ? '🦅 '
        : sp.diet === 'Carnivore' || sp.diet === 'Piscivore'
        ? '🥩 '
        : '🌿 ';
    title.textContent = `${icon}${sp.name}`;

    const maBadge = document.createElement('span');
    maBadge.className = 'atlas-card-ma';
    maBadge.textContent = `${sp.paleoMa} MYA`;
    if (era) {
      maBadge.style.color = era.themeColor;
    }

    head.appendChild(title);
    head.appendChild(maBadge);

    const sci = document.createElement('div');
    sci.className = 'atlas-card-sci';
    sci.textContent = `${sp.scientificName} — ${sp.meaning}`;

    const tags = document.createElement('div');
    tags.className = 'atlas-card-tags';

    [
      era ? era.name : sp.periodLabel,
      `${sp.metrics.lengthM}m • ${sp.metrics.weightLabel}`,
      sp.clade.split('(')[0].trim(),
    ].forEach((tText) => {
      const tag = document.createElement('span');
      tag.className = 'atlas-tag';
      tag.textContent = tText;
      tags.appendChild(tag);
    });

    const desc = document.createElement('div');
    desc.className = 'atlas-card-desc';
    desc.textContent = sp.story;

    card.appendChild(head);
    card.appendChild(sci);
    card.appendChild(tags);
    card.appendChild(desc);

    card.addEventListener('click', () => {
      atlasModal.classList.add('hidden');
      engine.setViewMode('lab');
      engine.selectSpecies(sp.id);
    });

    atlasGridBody.appendChild(card);
  });
}

function openAtlasModal() {
  renderAtlasModal();
  atlasModal.classList.remove('hidden');
}

document.getElementById('btn-open-atlas-modal')?.addEventListener('click', openAtlasModal);
document.getElementById('btn-sidebar-atlas')?.addEventListener('click', openAtlasModal);
document.getElementById('btn-close-atlas-modal')?.addEventListener('click', () => {
  atlasModal.classList.add('hidden');
});

atlasSearchInput?.addEventListener('input', renderAtlasModal);
atlasEraSelect?.addEventListener('change', renderAtlasModal);
atlasDietSelect?.addEventListener('change', renderAtlasModal);
atlasSortSelect?.addEventListener('change', renderAtlasModal);

// Close modals (and any phone/tablet bottom sheet) on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    driftModal.classList.add('hidden');
    impactModal.classList.add('hidden');
    quizModal.classList.add('hidden');
    atlasModal?.classList.add('hidden');
    closeMobileSheet();
  }
});

// Boot Application
updateDynamicCountLabels();
renderEraTabs();
renderSpeciesRoster();
engine.init();

// Read-only QA/debug handle (lets automated screenshot harnesses frame species & camera)
Object.defineProperty(window, 'dinoVerseDebug', {
  value: Object.freeze({ engine }),
  writable: false,
  configurable: false,
});

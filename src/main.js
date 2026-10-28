import { ERAS, SPECIES, QUIZ_QUESTIONS } from './data/dinosaurs.js';
import { DinoWorldEngine } from './engine/DinoWorldEngine.js';
import { renderContinentalDriftTexture } from './engine/HyperRealKit.js';
import { BioAcousticAudio, CHIRP_VOICE_PRESETS } from './engine/BioAcousticAudio.js';
import {
  SUPPORTED_LANGUAGES,
  resolveSupportedLang,
  UI_STRINGS,
  ERA_LOCALIZATIONS,
  getLocalizedDriftDescription,
  IMPACT_STAGE_LOCALIZATIONS,
  QUIZ_LOCALIZATIONS,
} from './i18n/locales.js';
import { getLocalizedSpecies } from './i18n/speciesLocales.js';
import { initCookieConsent } from './consent.js';

/**
 * main.js — Safe DOM Controller for DinoVerse 3D (9-Language Internationalized Edition).
 * Built strictly with createElement / textContent / replaceChildren (zero innerHTML).
 */

const LANG_STORAGE_KEY = 'dinoverse-lang';
const discoveredSpecies = new Set(['tyrannosaurus-rex']);
let currentFilter = 'all';
let currentSearch = '';
let activeHotspotIndex = -1;
let lastTtsStatus = null;

// Resolve initial language from localStorage or browser locale (defaults to English 'en')
let currentLang = 'en';
try {
  const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
  if (savedLang) {
    currentLang = resolveSupportedLang(savedLang);
  }
} catch {
  // Ignore storage restrictions
}

const audio = new BioAcousticAudio();
audio.setLanguage(currentLang);

function ui() {
  return UI_STRINGS[currentLang] || UI_STRINGS.en;
}

function getEraLoc(era) {
  if (!era) return { name: '', timeRange: '', flora: '' };
  const loc = ERA_LOCALIZATIONS[currentLang]?.[era.id];
  return {
    name: loc?.name || era.name,
    timeRange: loc?.timeRange || era.timeRange,
    flora: loc?.flora || era.flora,
  };
}

function getSpLoc(sp, era) {
  const resolvedEra = era || ERAS.find((e) => e.id === sp?.eraId);
  return getLocalizedSpecies(sp, resolvedEra, currentLang);
}

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
const whatifToastText = document.getElementById('whatif-toast-text');
const btnToastMinimize = document.getElementById('btn-toast-minimize');
const btnToastClose = document.getElementById('btn-toast-close');

const btnHotspotMode = document.getElementById('btn-hotspot-mode');
const btnInspectorPins = document.getElementById('btn-inspector-pins');
const btnToggleScale = document.getElementById('btn-toggle-scale');
const btnResetCamera = document.getElementById('btn-reset-camera');
const btnToggleFullview = document.getElementById('btn-toggle-fullview');
const btnDockFullview = document.getElementById('btn-dock-fullview');
const btnDockFullscreen = document.getElementById('btn-dock-fullscreen');
const btnQuickDock = document.getElementById('btn-quick-dock');
const btnQuickExitFullview = document.getElementById('btn-quick-exit-fullview');

const btnPlayRoar = document.getElementById('btn-play-roar');
const btnPlayFootsteps = document.getElementById('btn-play-footsteps');
const btnNarrateStory = document.getElementById('btn-narrate-story');
const btnTriggerWhatif = document.getElementById('btn-trigger-whatif');

const btnToggleAmbience = document.getElementById('btn-toggle-ambience');
const btnThemeLight = document.getElementById('btn-theme-light');
const btnThemeDark = document.getElementById('btn-theme-dark');
const langSelect = document.getElementById('lang-select');
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
  const s = ui();
  const suffix = document.createElement('span');
  suffix.className = 'lbl-long';
  suffix.textContent = s.discoveredSuffix;
  passportCounter.title = s.passportTitle;
  passportCounter.replaceChildren(`🦴 ${discoveredSpecies.size} / ${SPECIES.length}`, suffix);
}

// -----------------------------------------------------------------------------
// 1. TOP ERA TABS NAVIGATION
// -----------------------------------------------------------------------------
function renderEraTabs() {
  const activeEraId = ERAS[engine.activeEraIndex]?.id || engine.activeSpecies?.eraId;
  eraTabsNav.replaceChildren();
  ERAS.forEach((era) => {
    const loc = getEraLoc(era);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'era-tab-btn';
    if (activeEraId === era.id) {
      btn.classList.add('active');
    }
    btn.dataset.eraId = era.id;

    const topSpan = document.createElement('span');
    topSpan.className = 'era-tab-top';
    topSpan.textContent = `${era.number}. ${loc.name}`;

    const subSpan = document.createElement('span');
    subSpan.className = 'era-tab-sub';
    subSpan.textContent = loc.timeRange;

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
  const loc = getEraLoc(era);
  const range = document.createElement('span');
  range.className = 'lbl-long';
  range.textContent = ` (${loc.timeRange})`;
  bannerEraName.replaceChildren(loc.name, range);
  bannerEraFlora.textContent = loc.flora;
}

// -----------------------------------------------------------------------------
// 2. LEFT PANEL: 74-SPECIES ROSTER & FILTERS
// -----------------------------------------------------------------------------
function getFilteredSpecies() {
  return SPECIES.filter((sp) => {
    if (currentFilter === 'Carnivore' && sp.diet !== 'Carnivore' && sp.diet !== 'Piscivore') return false;
    if (currentFilter === 'Herbivore' && sp.diet !== 'Herbivore' && sp.diet !== 'Omnivore') return false;
    if (currentFilter === 'Ocean' && sp.domain !== 'Ocean' && sp.domain !== 'Semi-Aquatic') return false;
    if (currentFilter === 'Sky' && sp.domain !== 'Sky') return false;

    if (currentSearch.trim() !== '') {
      const q = currentSearch.toLowerCase();
      const loc = getSpLoc(sp);
      const hay = `${sp.name} ${loc.name} ${sp.scientificName} ${sp.meaning} ${loc.meaning} ${sp.eraId} ${sp.clade} ${loc.periodLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderSpeciesRoster() {
  const s = ui();
  speciesRosterList.replaceChildren();
  const list = getFilteredSpecies();

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'story-paragraph';
    empty.textContent = s.noSpeciesMatch;
    speciesRosterList.appendChild(empty);
    return;
  }

  list.forEach((sp) => {
    const era = ERAS.find((e) => e.id === sp.eraId);
    const eraLoc = getEraLoc(era);
    const spLoc = getSpLoc(sp, era);

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
        : sp.diet === 'Carnivore' || sp.diet === 'Piscivore'
        ? '🥩 '
        : '🌿 ';
    nameSpan.textContent = `${icon}${spLoc.name}`;

    const eraDot = document.createElement('span');
    eraDot.className = 'species-card-era-dot';
    eraDot.textContent = `${sp.paleoMa} ${s.myaSuffix}`;
    if (era) {
      eraDot.style.color = era.themeColor;
    }

    topRow.appendChild(nameSpan);
    topRow.appendChild(eraDot);

    const metaRow = document.createElement('div');
    metaRow.className = 'species-card-meta';
    const leftMeta = document.createElement('span');
    leftMeta.textContent = era ? eraLoc.name : spLoc.periodLabel;
    const rightMeta = document.createElement('span');
    rightMeta.textContent = `${sp.metrics.lengthM}m • ${spLoc.dietLabel}`;
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
  if (!sp) return;
  const s = ui();
  const spLoc = getSpLoc(sp, era);

  inspEraBadge.textContent = spLoc.periodLabel;
  if (era) {
    inspEraBadge.style.borderColor = era.themeColor;
    inspEraBadge.style.color = era.themeColor;
  }
  inspDietBadge.textContent = `${sp.diet === 'Carnivore' ? '🥩' : sp.diet === 'Piscivore' ? '🐟' : '🌿'} ${spLoc.dietLabel}`;
  inspStanceBadge.textContent = `${spLoc.stanceLabel} (${spLoc.domainLabel})`;

  inspName.textContent = spLoc.name;
  inspScientific.textContent = sp.scientificName;
  inspPronunciation.textContent = `🔊 ${sp.pronunciation}`;
  inspMeaning.textContent = `${s.meaningLabel}: ${spLoc.meaning} • ${s.cladeLabel}: ${sp.clade}`;

  const feetLen = Math.round(sp.metrics.lengthM * 3.28084);
  const feetH = Math.round(sp.metrics.heightM * 3.28084);
  metricLength.textContent = `${sp.metrics.lengthM} m (${feetLen} ft)`;
  metricHeight.textContent = `${sp.metrics.heightM} m (${feetH} ft)`;
  metricWeight.textContent = sp.metrics.weightLabel;
  metricSpeedBite.textContent = `${sp.metrics.speedKmh} km/h • ${sp.metrics.biteForceN.toLocaleString()} N`;

  btnTriggerWhatif.textContent = spLoc.whatIfLabel || s.btnWhatIfDefault;
  whatifToast.classList.add('hidden');

  render2DScaleComparison(sp, spLoc);

  inspStory.textContent = spLoc.story;

  // Render 3 Clickable Anatomical Hotspots
  inspHotspotsList.replaceChildren();
  (spLoc.hotspots || []).forEach((hs, idx) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hotspot-detail-card';
    if (activeHotspotIndex === idx) {
      card.classList.add('active');
    }
    card.dataset.hsIndex = String(idx);

    const title = document.createElement('div');
    title.className = 'hotspot-card-title';
    title.textContent = `${idx + 1}. ${hs.title}`;

    const bone = document.createElement('div');
    bone.className = 'hotspot-card-bone';
    bone.textContent = `${s.anatomyPrefix} ${hs.organOrBone}`;

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
  (spLoc.funFacts || []).forEach((fact) => {
    const li = document.createElement('li');
    li.textContent = fact;
    inspFactsList.appendChild(li);
  });

  // Discovery Passport
  inspDiscoveryText.textContent = spLoc.discoveryText;
}

function render2DScaleComparison(sp, spLocInput) {
  if (!sp) return;
  const s = ui();
  const spLoc = spLocInput || getSpLoc(sp);
  scaleBarsContainer.replaceChildren();
  const maxRef = Math.max(14.0, sp.metrics.lengthM);
  const comparisons = [
    { label: `🦖 ${spLoc.name}`, meters: sp.metrics.lengthM, color: '#f59e0b' },
    { label: s.scaleKid, meters: 1.4, color: '#38bdf8' },
    { label: s.scaleAdult, meters: 1.8, color: '#10b981' },
    { label: s.scaleBus, meters: 11.0, color: '#eab308' },
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
// 4. FLOATING 3D ANATOMICAL HOTSPOT PINS & TOAST DESCRIPTION CONTROLS
// -----------------------------------------------------------------------------
const HOTSPOT_STORAGE_KEY = 'dinoverse-hotspots-mode';
const HOTSPOT_MODES = ['full', 'compact', 'hidden'];
let hotspotPinElements = [];
let hotspotDisplayMode = 'full';
try {
  const savedMode = localStorage.getItem(HOTSPOT_STORAGE_KEY);
  if (HOTSPOT_MODES.includes(savedMode)) {
    hotspotDisplayMode = savedMode;
  }
} catch {
  // Ignore storage errors in restricted privacy modes
}

function setHotspotDisplayMode(mode) {
  const s = ui();
  const validMode = HOTSPOT_MODES.includes(mode) ? mode : 'full';
  hotspotDisplayMode = validMode;
  hotspotOverlay.dataset.hotspotMode = validMode;
  try {
    localStorage.setItem(HOTSPOT_STORAGE_KEY, validMode);
  } catch {
    // Ignore storage errors
  }

  const labelMap = {
    full: s.bubblesFull,
    compact: s.bubblesMin,
    hidden: s.bubblesOff,
  };
  const inspLabelMap = {
    full: s.inspBubblesFull,
    compact: s.inspBubblesMin,
    hidden: s.inspBubblesOff,
  };
  if (btnHotspotMode) {
    btnHotspotMode.textContent = labelMap[validMode];
    btnHotspotMode.dataset.hotspotMode = validMode;
    btnHotspotMode.setAttribute('aria-pressed', String(validMode !== 'hidden'));
  }
  if (btnInspectorPins) {
    btnInspectorPins.textContent = inspLabelMap[validMode];
  }
}

function cycleHotspotDisplayMode() {
  const idx = HOTSPOT_MODES.indexOf(hotspotDisplayMode);
  const next = HOTSPOT_MODES[(idx + 1) % HOTSPOT_MODES.length];
  setHotspotDisplayMode(next);
}

setHotspotDisplayMode(hotspotDisplayMode);
btnHotspotMode?.addEventListener('click', cycleHotspotDisplayMode);
btnInspectorPins?.addEventListener('click', cycleHotspotDisplayMode);

function showViewportToast(message) {
  if (whatifToastText) {
    whatifToastText.textContent = message;
  } else {
    whatifToast.textContent = message;
  }
  whatifToast.classList.remove('hidden');
}

function setToastMinimized(minimized) {
  const s = ui();
  whatifToast.classList.toggle('whatif-toast--minimized', minimized);
  if (btnToastMinimize) {
    btnToastMinimize.textContent = minimized ? '+' : '−';
    const label = minimized ? s.toastExpandTitle : s.toastMinimizeTitle;
    btnToastMinimize.title = label;
    btnToastMinimize.setAttribute('aria-label', label);
  }
  if (btnToastClose) {
    btnToastClose.title = s.toastCloseTitle;
    btnToastClose.setAttribute('aria-label', s.toastCloseTitle);
  }
}

btnToastMinimize?.addEventListener('click', (e) => {
  e.stopPropagation();
  setToastMinimized(!whatifToast.classList.contains('whatif-toast--minimized'));
});

btnToastClose?.addEventListener('click', (e) => {
  e.stopPropagation();
  whatifToast.classList.add('hidden');
});

whatifToastText?.addEventListener('click', () => {
  if (whatifToast.classList.contains('whatif-toast--minimized')) {
    setToastMinimized(false);
  } else {
    whatifToast.classList.add('hidden');
  }
});

function rebuildFloatingHotspotPins(sp) {
  if (!sp) return;
  const s = ui();
  const spLoc = getSpLoc(sp);
  hotspotOverlay.replaceChildren();
  hotspotPinElements = [];
  (spLoc.hotspots || []).forEach((hs, idx) => {
    const pin = document.createElement('div');
    pin.className = 'hotspot-pin-btn';

    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.className = 'hotspot-pin-main';
    mainBtn.title = `${idx + 1}. ${hs.title} — ${hs.detail}`;

    const num = document.createElement('span');
    num.className = 'hotspot-pin-num';
    num.textContent = String(idx + 1);

    const text = document.createElement('span');
    text.className = 'hotspot-pin-label';
    text.textContent = hs.title;

    mainBtn.appendChild(num);
    mainBtn.appendChild(text);
    mainBtn.addEventListener('click', () => {
      selectHotspot(idx);
    });

    const minBtn = document.createElement('button');
    minBtn.type = 'button';
    minBtn.className = 'hotspot-pin-ctrl hotspot-pin-min';
    minBtn.textContent = '−';
    minBtn.title = s.pinMinimizeTitle;
    minBtn.setAttribute('aria-label', s.pinMinimizeTitle);
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setHotspotDisplayMode('compact');
    });

    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'hotspot-pin-ctrl hotspot-pin-hide';
    hideBtn.textContent = '✕';
    hideBtn.title = s.pinHideTitle;
    hideBtn.setAttribute('aria-label', s.pinHideTitle);
    hideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setHotspotDisplayMode('hidden');
    });

    pin.appendChild(mainBtn);
    pin.appendChild(minBtn);
    pin.appendChild(hideBtn);

    hotspotOverlay.appendChild(pin);
    hotspotPinElements.push(pin);
  });
}

function updateFloatingHotspotPositions() {
  if (engine.viewMode !== 'lab' || hotspotDisplayMode === 'hidden') return;
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

  const spLoc = getSpLoc(engine.activeSpecies);
  const hs = spLoc?.hotspots?.[idx];
  if (hs) {
    showViewportToast(`🔬 ${hs.title}: ${hs.detail}`);
  }
}

// -----------------------------------------------------------------------------
// 5. LIVE MINI PALEO-EARTH CONTINENTAL DRIFT TRACKER
// -----------------------------------------------------------------------------
function updateMiniPaleoEarth(sp, era) {
  if (!sp) return;
  const s = ui();
  const eraLoc = getEraLoc(era || ERAS.find((e) => e.id === sp.eraId));
  const spLoc = getSpLoc(sp, era);
  miniEarthEraLabel.textContent = `🌍 ${era ? eraLoc.name : spLoc.periodLabel} (${sp.paleoMa} ${s.myaSuffix})`;
  const c = sp.climate || { o2Pct: 26, co2Ppm: 1400, tempC: 21 };
  miniEarthClimateBadge.textContent = `O₂ ${c.o2Pct}% • CO₂ ${c.co2Ppm}ppm • +${c.tempC}°C`;
  miniEarthPinCaption.textContent = `🦴 ${sp.discovery?.location || 'Global'}, ${sp.discovery?.country || ''}`;

  renderContinentalDriftTexture(sp.paleoMa, {
    canvas: miniDriftCanvas,
    width: 420,
    height: 210,
    mapPin: sp.discovery?.mapPin,
    pinLabel: spLoc.name,
  });
}

// -----------------------------------------------------------------------------
// 5b. PHONES & TABLETS: SPECIES LIST AND FIELD GUIDE AS BOTTOM SHEETS
// -----------------------------------------------------------------------------
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
if (typeof SHEET_LAYOUT_QUERY.addEventListener === 'function') {
  SHEET_LAYOUT_QUERY.addEventListener('change', closeMobileSheet);
} else if (typeof SHEET_LAYOUT_QUERY.addListener === 'function') {
  SHEET_LAYOUT_QUERY.addListener(closeMobileSheet);
}

// -----------------------------------------------------------------------------
// 6. INTERACTIVE CONTROLS, FULL VIEW / FULLSCREEN & BIO-ACOUSTIC TRIGGERS
// -----------------------------------------------------------------------------
let isFullView = false;
let isDockMinimized = false;

function setDockMinimized(minimized) {
  const s = ui();
  isDockMinimized = Boolean(minimized);
  document.body.classList.toggle('dock-minimized', isDockMinimized);
  if (btnQuickDock) {
    btnQuickDock.setAttribute('aria-pressed', String(isDockMinimized));
    btnQuickDock.textContent = isDockMinimized ? s.vpShowDock : s.vpHideDock;
  }
}

function renderTopFullViewButton() {
  if (!btnToggleFullview) return;
  const s = ui();
  btnToggleFullview.setAttribute('aria-pressed', String(isFullView));
  if (isFullView) {
    btnToggleFullview.textContent = s.btnExitFullView;
  } else {
    const longSpan = document.createElement('span');
    longSpan.className = 'lbl-long';
    longSpan.textContent = s.btnFullViewTopLong;
    btnToggleFullview.replaceChildren('⛶ ', longSpan, s.btnFullViewTopShort);
  }
}

function setFullView(active) {
  const s = ui();
  isFullView = Boolean(active);
  document.body.classList.toggle('full-view', isFullView);
  if (!isFullView) {
    setDockMinimized(false);
  }
  renderTopFullViewButton();
  if (btnDockFullview) {
    btnDockFullview.setAttribute('aria-pressed', String(isFullView));
    btnDockFullview.textContent = isFullView ? s.btnExitFullView : s.vpFullView;
  }
  btnQuickDock?.classList.toggle('hidden', !isFullView);
  btnQuickExitFullview?.classList.toggle('hidden', !isFullView);
  window.dispatchEvent(new Event('resize'));
}

function updateFullscreenButtonUI() {
  const s = ui();
  const fsActive = Boolean(document.fullscreenElement);
  if (btnDockFullscreen) {
    btnDockFullscreen.setAttribute('aria-pressed', String(fsActive));
    btnDockFullscreen.textContent = fsActive ? s.vpExitFullScreen : s.vpFullScreen;
  }
}

async function toggleBrowserFullscreen() {
  try {
    if (!document.fullscreenElement) {
      setFullView(true);
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    setFullView(!isFullView);
  }
  updateFullscreenButtonUI();
}

btnToggleFullview?.addEventListener('click', () => setFullView(!isFullView));
btnDockFullview?.addEventListener('click', () => setFullView(!isFullView));
btnQuickExitFullview?.addEventListener('click', () => {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  setFullView(false);
});
btnQuickDock?.addEventListener('click', () => setDockMinimized(!isDockMinimized));
btnDockFullscreen?.addEventListener('click', toggleBrowserFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenButtonUI);

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
  const s = ui();
  const next = !engine.showScaleComparator;
  engine.setViewMode('lab');
  engine.setScaleComparatorVisible(next);
  btnToggleScale.setAttribute('aria-pressed', String(next));
  if (next) {
    const spLoc = getSpLoc(engine.activeSpecies);
    showViewportToast(
      s.toastScale
        .replace('{name}', spLoc.name)
        .replace('{len}', String(engine.activeSpecies.metrics.lengthM))
    );
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
  const spLoc = getSpLoc(engine.activeSpecies);
  showViewportToast(`🔊 ${spLoc.name}: ${spLoc.vocalDescription || 'Prehistoric vocal call'}`);
});

btnPlayFootsteps.addEventListener('click', () => {
  const s = ui();
  audio.unlock();
  audio.playFootsteps(engine.activeSpecies);
  showViewportToast(
    s.toastFootsteps
      .replace('{weight}', engine.activeSpecies.metrics.weightLabel)
      .replace('{speed}', String(engine.activeSpecies.metrics.speedKmh))
  );
});

let lastNarrationState = { speaking: false, phase: 'idle', narrationEngine: 'device' };
function setNarrationButtonState(speaking, phase, narrationEngine) {
  const s = ui();
  lastNarrationState = { speaking, phase, narrationEngine };
  btnNarrateStory.classList.toggle('bio-btn--busy', speaking && phase === 'loading');
  btnNarrateStory.classList.toggle('bio-btn--speaking', speaking && phase === 'playing');
  if (!speaking) {
    btnNarrateStory.textContent = s.btnNarrateIdle;
  } else if (phase === 'loading') {
    btnNarrateStory.textContent = narrationEngine === 'chirp' ? s.btnNarrateWarmingChirp : s.btnNarrateWarmingDevice;
  } else {
    btnNarrateStory.textContent = narrationEngine === 'chirp' ? s.btnNarrateStopChirp : s.btnNarrateStopDevice;
  }
}

btnNarrateStory.addEventListener('click', () => {
  audio.unlock();
  if (audio.isSpeaking) {
    audio.stopNarration(() => setNarrationButtonState(false, 'idle'));
    return;
  }
  const s = ui();
  const sp = engine.activeSpecies;
  const spLoc = getSpLoc(sp);
  const storyText = Array.isArray(spLoc.story) ? spLoc.story.join(' ') : String(spLoc.story || '');
  const fullSpeech =
    currentLang === 'en'
      ? s.narrationTemplate
          .replace('{name}', spLoc.name)
          .replace('{sci}', sp.scientificName)
          .replace('{meaning}', spLoc.meaning)
          .replace('{period}', spLoc.periodLabel)
          .replace('{story}', storyText)
          .replace('{fact}', spLoc.funFacts?.[0] || '')
      : `${storyText} ${spLoc.funFacts?.[1] || spLoc.funFacts?.[0] || ''}`.trim();
  audio.narrateText(fullSpeech, setNarrationButtonState);
});

btnTriggerWhatif.addEventListener('click', () => {
  audio.unlock();
  const active = engine.toggleWhatIf();
  if (active) {
    const spLoc = getSpLoc(engine.activeSpecies);
    audio.playRoar(engine.activeSpecies, { intensity: 1.3, kind: 'apex' });
    showViewportToast(`⚡ ${spLoc.whatIfOutcome}`);
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
  const s = ui();
  const on = audio.ambienceEnabled;
  btnToggleAmbience.setAttribute('aria-pressed', String(on));
  btnToggleAmbience.textContent = on ? s.soundscapeOn : s.soundscapeOff;
}
btnToggleAmbience.addEventListener('click', () => {
  audio.unlock();
  audio.setAmbienceEnabled(!audio.ambienceEnabled);
  renderAmbienceToggle();
  refreshSoundscape();
  if (audio.ambienceEnabled) greetWithCall(engine.activeSpecies);
});
renderAmbienceToggle();

// Labeled Light Mode vs. Dark Mode selector (controls both 3D backdrop and UI theme; light by default)
function renderThemeModeSwitcher(mode) {
  const s = ui();
  const isLight = mode !== 'dark';
  if (btnThemeLight) {
    btnThemeLight.classList.toggle('active', isLight);
    btnThemeLight.setAttribute('aria-pressed', String(isLight));
    btnThemeLight.title = s.themeLightTitle;
    const lbl = btnThemeLight.querySelector('.lbl-theme');
    if (lbl) lbl.textContent = s.themeLight;
  }
  if (btnThemeDark) {
    btnThemeDark.classList.toggle('active', !isLight);
    btnThemeDark.setAttribute('aria-pressed', String(!isLight));
    btnThemeDark.title = s.themeDarkTitle;
    const lbl = btnThemeDark.querySelector('.lbl-theme');
    if (lbl) lbl.textContent = s.themeDark;
  }
}

function applyThemeMode(requestedMode) {
  const mode = engine.setBackdropTheme(requestedMode === 'dark' ? 'dark' : 'light');
  document.documentElement.dataset.backdrop = mode;
  try {
    localStorage.setItem(BACKDROP_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable (privacy mode): the choice still applies for this visit.
  }
  renderThemeModeSwitcher(mode);
}

btnThemeLight?.addEventListener('click', () => applyThemeMode('light'));
btnThemeDark?.addEventListener('click', () => applyThemeMode('dark'));
renderThemeModeSwitcher(engine.backdropTheme);

// Narrator voice picker: Google Cloud Chirp 3 HD voices (via the local proxy) or the device voice
function renderVoicePicker(status) {
  if (status !== undefined) {
    lastTtsStatus = status;
  }
  const s = ui();
  const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
  narratorVoiceSelect.replaceChildren();
  const chirpAvailable = Boolean(lastTtsStatus?.available);
  if (chirpAvailable) {
    const allowed = new Set(lastTtsStatus.voices || []);
    CHIRP_VOICE_PRESETS.filter((v) => allowed.size === 0 || allowed.has(v.id)).forEach((preset) => {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = preset.label;
      narratorVoiceSelect.appendChild(opt);
    });
  }
  const deviceOpt = document.createElement('option');
  deviceOpt.value = 'device';
  deviceOpt.textContent = (chirpAvailable ? s.voiceOptionDeviceFallback : s.voiceOptionDeviceOnly).replace(
    '{lang}',
    langMeta.nativeName
  );
  narratorVoiceSelect.appendChild(deviceOpt);

  const wanted = audio.narrationMode === 'device' || !chirpAvailable ? 'device' : audio.voiceName;
  narratorVoiceSelect.value = wanted;
  if (narratorVoiceSelect.value !== wanted) {
    narratorVoiceSelect.selectedIndex = 0;
  }
  if (lastTtsStatus !== null) {
    audio.setVoice(narratorVoiceSelect.value);
  }

  narratorVoiceStatus.classList.toggle('voice-status--ok', chirpAvailable);
  narratorVoiceStatus.classList.toggle('voice-status--fallback', !chirpAvailable);
  narratorVoiceStatus.textContent = chirpAvailable
    ? s.voiceReadyChirp
    : s.voiceFallbackDevice.replace('{lang}', langMeta.nativeName);
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

function updateLargeDriftLab(ma) {
  const s = ui();
  const numMa = Number(ma);
  driftMaSlider.value = String(numMa);
  driftMaReadout.textContent = s.driftReadoutUnit.replace('{ma}', String(numMa));
  driftExplanationText.textContent = getLocalizedDriftDescription(numMa, currentLang);

  const spLoc = getSpLoc(engine.activeSpecies);
  renderContinentalDriftTexture(numMa, {
    canvas: largeDriftCanvas,
    width: 960,
    height: 460,
    mapPin: engine.activeSpecies?.discovery?.mapPin,
    pinLabel: `${spLoc.name} (${s.fossilSiteSuffix})`,
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
  const impLoc = IMPACT_STAGE_LOCALIZATIONS[currentLang] || IMPACT_STAGE_LOCALIZATIONS.en;

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
    impactReadout.textContent = impLoc.s1Readout;
    impactExplanation.textContent = impLoc.s1Desc;

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
    impactReadout.textContent = impLoc.s2Readout;
    impactExplanation.textContent = impLoc.s2Desc;

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
    impactReadout.textContent = impLoc.s3Readout;
    impactExplanation.textContent = impLoc.s3Desc;

    ctx.save();
    ctx.fillStyle = 'rgba(30, 27, 75, 0.68)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText(impLoc.s3Canvas, w / 2, h / 2);
    ctx.restore();
  } else {
    impactReadout.textContent = impLoc.s4Readout;
    impactExplanation.textContent = impLoc.s4Desc;

    ctx.save();
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'center';
    ctx.fillText(impLoc.s4Canvas, w / 2, 36);
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
  const s = ui();
  const localizedQuiz = QUIZ_LOCALIZATIONS[currentLang] || QUIZ_QUESTIONS;
  quizModalBody.replaceChildren();
  QUIZ_QUESTIONS.forEach((baseQ, qIdx) => {
    const qLoc = localizedQuiz[qIdx] || baseQ;
    const box = document.createElement('div');
    box.className = 'quiz-question-box';

    const title = document.createElement('div');
    title.className = 'quiz-q-title';
    title.textContent = `${qIdx + 1}. ${qLoc.question}`;
    box.appendChild(title);

    const feedback = document.createElement('div');
    feedback.className = 'quiz-feedback hidden';

    (qLoc.options || baseQ.options).forEach((optText, oIdx) => {
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.className = 'quiz-opt-btn';
      optBtn.textContent = optText;

      optBtn.addEventListener('click', () => {
        const isCorrect = oIdx === baseQ.correctIndex;
        optBtn.classList.add(isCorrect ? 'correct' : 'wrong');
        feedback.textContent = `${isCorrect ? s.quizCorrect : s.quizWrong}${qLoc.explanation || baseQ.explanation}`;
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
// 10. MODAL 4: FULL 74-SPECIES PREHISTORIC ENCYCLOPEDIA ATLAS
// -----------------------------------------------------------------------------
const atlasModal = document.getElementById('atlas-modal');
const atlasGridBody = document.getElementById('atlas-grid-body');
const atlasSearchInput = document.getElementById('atlas-search-input');
const atlasEraSelect = document.getElementById('atlas-era-select');
const atlasDietSelect = document.getElementById('atlas-diet-select');
const atlasSortSelect = document.getElementById('atlas-sort-select');
const rosterCountLabel = document.getElementById('roster-count-label');

function updateDynamicCountLabels() {
  const s = ui();
  const total = SPECIES.length;
  if (rosterCountLabel) {
    rosterCountLabel.textContent = s.rosterCount.replace('{count}', String(total));
  }
  const allPill = dietFilterBar.querySelector('[data-filter="all"]');
  if (allPill) {
    allPill.textContent = s.filterAll.replace('{count}', String(total));
  }
  const atlasCount = document.getElementById('atlas-count');
  if (atlasCount) {
    atlasCount.textContent = String(total);
  }
}

function renderAtlasModal() {
  if (!atlasGridBody) return;
  const s = ui();
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
      const spLoc = getSpLoc(sp);
      const hay = `${sp.name} ${spLoc.name} ${sp.scientificName} ${sp.meaning} ${spLoc.meaning} ${sp.clade} ${sp.periodLabel} ${spLoc.periodLabel} ${sp.discovery?.location || ''} ${sp.discovery?.country || ''} ${sp.discovery?.formation || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sortMode === 'size-desc') {
    filtered.sort((a, b) => (b.metrics?.lengthM || 0) - (a.metrics?.lengthM || 0));
  } else if (sortMode === 'name') {
    filtered.sort((a, b) => getSpLoc(a).name.localeCompare(getSpLoc(b).name, currentLang));
  }

  filtered.forEach((sp) => {
    const era = ERAS.find((e) => e.id === sp.eraId);
    const eraLoc = getEraLoc(era);
    const spLoc = getSpLoc(sp, era);

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
    title.textContent = `${icon}${spLoc.name}`;

    const maBadge = document.createElement('span');
    maBadge.className = 'atlas-card-ma';
    maBadge.textContent = `${sp.paleoMa} ${s.myaSuffix}`;
    if (era) {
      maBadge.style.color = era.themeColor;
    }

    head.appendChild(title);
    head.appendChild(maBadge);

    const sci = document.createElement('div');
    sci.className = 'atlas-card-sci';
    sci.textContent = `${sp.scientificName} — ${spLoc.meaning}`;

    const tags = document.createElement('div');
    tags.className = 'atlas-card-tags';

    [
      era ? eraLoc.name : spLoc.periodLabel,
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
    desc.textContent = spLoc.story;

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

// -----------------------------------------------------------------------------
// 11. 9-LANGUAGE INTERNATIONALIZATION (i18n) LIVE SWITCHER
// -----------------------------------------------------------------------------
function makeLongSpan(text) {
  const span = document.createElement('span');
  span.className = 'lbl-long';
  span.textContent = text;
  return span;
}

function applyStaticUiTranslations() {
  const s = ui();
  const total = SPECIES.length;
  document.documentElement.lang = currentLang;
  document.title = s.pageTitle;

  const brandSub = document.querySelector('.brand-subtitle');
  if (brandSub) brandSub.textContent = s.brandSubtitle;

  // Top action buttons
  const btnAtlas = document.getElementById('btn-open-atlas-modal');
  if (btnAtlas) {
    const countSpan = document.createElement('span');
    countSpan.id = 'atlas-count';
    countSpan.textContent = String(total);
    btnAtlas.replaceChildren('📖 ', makeLongSpan(s.btnAtlasLong), `${s.btnAtlasShort} (`, countSpan, ')');
  }

  const btnDrift = document.getElementById('btn-open-drift-modal');
  if (btnDrift) {
    btnDrift.replaceChildren('🌍 ', makeLongSpan(s.btnDriftLong), s.btnDriftShort);
  }

  const btnImpact = document.getElementById('btn-open-impact-modal');
  if (btnImpact) {
    btnImpact.replaceChildren('☄️ ', makeLongSpan(s.btnImpactLong), s.btnImpactShort);
  }

  const btnQuiz = document.getElementById('btn-open-quiz-modal');
  if (btnQuiz) {
    btnQuiz.textContent = s.btnQuiz;
  }

  renderTopFullViewButton();
  renderThemeModeSwitcher(engine.backdropTheme);

  const langLabel = document.querySelector('.lang-switcher-pill');
  if (langLabel) langLabel.title = s.langPickerTitle;
  if (langSelect) {
    langSelect.setAttribute('aria-label', s.langPickerTitle);
    langSelect.value = currentLang;
  }

  // Cookie consent banner + 🍪 settings button
  const cookieSettingsBtn = document.getElementById('btn-cookie-settings');
  if (cookieSettingsBtn) {
    cookieSettingsBtn.title = s.cookieSettingsTitle;
    cookieSettingsBtn.setAttribute('aria-label', s.cookieSettingsTitle);
  }
  const cookieTitle = document.getElementById('cookie-banner-title');
  if (cookieTitle) cookieTitle.textContent = s.cookieTitle;
  const cookieText = document.getElementById('cookie-banner-text');
  if (cookieText) cookieText.textContent = s.cookieText;
  const cookieLink = document.getElementById('cookie-learn-more');
  if (cookieLink) {
    cookieLink.textContent = s.cookieLearnMore;
    const googleHl = currentLang === 'pt' ? 'pt-BR' : currentLang;
    cookieLink.href = `https://policies.google.com/technologies/partner-sites?hl=${encodeURIComponent(googleHl)}`;
  }
  const cookieAccept = document.getElementById('btn-cookie-accept');
  if (cookieAccept) cookieAccept.textContent = s.cookieAccept;
  const cookieDecline = document.getElementById('btn-cookie-decline');
  if (cookieDecline) cookieDecline.textContent = s.cookieDecline;

  // Left Roster Panel
  const rosterSheetTitle = document.querySelector('#roster-panel .sheet-title');
  if (rosterSheetTitle) rosterSheetTitle.textContent = s.sheetPickCreature;

  updateDynamicCountLabels();

  const btnSidebarAtlas = document.getElementById('btn-sidebar-atlas');
  if (btnSidebarAtlas) btnSidebarAtlas.textContent = s.openFullAtlas;

  if (searchInput) {
    searchInput.placeholder = s.searchPlaceholder;
    searchInput.setAttribute('aria-label', s.searchPlaceholder);
  }

  const pillCarnivore = dietFilterBar?.querySelector('[data-filter="Carnivore"]');
  if (pillCarnivore) pillCarnivore.textContent = s.filterCarnivore;
  const pillHerbivore = dietFilterBar?.querySelector('[data-filter="Herbivore"]');
  if (pillHerbivore) pillHerbivore.textContent = s.filterHerbivore;
  const pillOcean = dietFilterBar?.querySelector('[data-filter="Ocean"]');
  if (pillOcean) pillOcean.textContent = s.filterOcean;
  const pillSky = dietFilterBar?.querySelector('[data-filter="Sky"]');
  if (pillSky) pillSky.textContent = s.filterSky;

  // Center Viewport Mode Switcher & Quick Bar
  if (modeBtnLab) {
    modeBtnLab.replaceChildren('🔬 ', makeLongSpan(s.modeLabLong), s.modeLabShort);
  }
  if (modeBtnPortal) {
    modeBtnPortal.replaceChildren(
      '⏳ ',
      makeLongSpan(s.modePortalPre),
      s.modePortalMid,
      makeLongSpan(s.modePortalHabitat),
      s.modePortalShort,
      makeLongSpan(s.modePortalEras)
    );
  }

  if (btnDockFullview) {
    btnDockFullview.textContent = isFullView ? s.btnExitFullView : s.vpFullView;
  }
  updateFullscreenButtonUI();
  setDockMinimized(isDockMinimized);
  setToastMinimized(whatifToast.classList.contains('whatif-toast--minimized'));

  // Bottom 3D Dock
  const layerGroupLabel = document.querySelector('.anatomy-layer-group .dock-group-label');
  if (layerGroupLabel) layerGroupLabel.textContent = s.dock3DLayer;

  const btnLayerSkin = document.querySelector('.layer-btn[data-layer="skin"]');
  if (btnLayerSkin) btnLayerSkin.replaceChildren(s.layerSkinShort, makeLongSpan(s.layerSkinLong));

  const btnLayerSkeleton = document.querySelector('.layer-btn[data-layer="skeleton"]');
  if (btnLayerSkeleton) btnLayerSkeleton.replaceChildren('🦴 ', makeLongSpan(s.layerSkeletonLong), s.layerSkeletonShort);

  setHotspotDisplayMode(hotspotDisplayMode);

  if (btnToggleScale) btnToggleScale.textContent = s.btnCompareSize;
  if (btnResetCamera) btnResetCamera.textContent = s.btnResetCamera;
  if (btnPlayRoar) btnPlayRoar.replaceChildren(s.btnRoarShort, makeLongSpan(s.btnRoarLong));
  if (btnPlayFootsteps) btnPlayFootsteps.replaceChildren('🐾 ', makeLongSpan(s.btnFootstepsLong), s.btnFootstepsShort);

  setNarrationButtonState(
    lastNarrationState.speaking,
    lastNarrationState.phase,
    lastNarrationState.narrationEngine
  );
  renderAmbienceToggle();

  const voicePickerLabel = document.querySelector('.voice-picker .dock-group-label');
  if (voicePickerLabel) voicePickerLabel.textContent = s.narratorLabel;
  renderVoicePicker();

  // Mobile Tabbar
  if (sheetToggles.roster) sheetToggles.roster.textContent = s.mobileTabSpecies;
  if (sheetToggles.guide) sheetToggles.guide.textContent = s.mobileTabGuide;

  // Right Inspector Static Headings & Metric Labels
  const guideSheetTitle = document.querySelector('#inspector-panel .sheet-title');
  if (guideSheetTitle) guideSheetTitle.textContent = s.sheetFieldGuide;

  const metricLabels = document.querySelectorAll('.metrics-grid .metric-label');
  if (metricLabels[0]) metricLabels[0].textContent = s.metricLength;
  if (metricLabels[1]) metricLabels[1].textContent = s.metricHeight;
  if (metricLabels[2]) metricLabels[2].textContent = s.metricWeight;
  if (metricLabels[3]) metricLabels[3].textContent = s.metricSpeedBite;

  const scaleChartTitle = document.querySelector('.scale-chart-title');
  if (scaleChartTitle) scaleChartTitle.textContent = s.scaleChartTitle;

  const storyHeading = document.querySelector('.story-card .section-heading');
  if (storyHeading) storyHeading.textContent = s.headingStory;

  const hotspotsHeading = document.querySelector('.hotspots-card .section-heading');
  if (hotspotsHeading) hotspotsHeading.textContent = s.headingHotspots;

  const factsHeading = document.querySelector('.facts-card .section-heading');
  if (factsHeading) factsHeading.textContent = s.headingFacts;

  const discoveryHeading = document.querySelector('.discovery-card .section-heading');
  if (discoveryHeading) discoveryHeading.textContent = s.headingDiscovery;

  // Modal 1: Drift Lab
  const driftTitle = document.getElementById('drift-modal-title');
  if (driftTitle) driftTitle.textContent = s.driftModalTitle;
  const driftSub = document.querySelector('#drift-modal .modal-subtitle');
  if (driftSub) driftSub.textContent = s.driftModalSubtitle;
  const driftSliderLabel = document.querySelector('label[for="drift-ma-slider"]');
  if (driftSliderLabel && driftMaReadout) {
    driftSliderLabel.replaceChildren(s.driftSliderPrefix, driftMaReadout);
  }
  const presetBtns = document.querySelectorAll('.preset-ma-btn');
  const presetMap = {
    '280': s.driftPreset280,
    '220': s.driftPreset220,
    '152': s.driftPreset152,
    '95': s.driftPreset95,
    '67': s.driftPreset67,
    '0': s.driftPreset0,
  };
  presetBtns.forEach((b) => {
    if (presetMap[b.dataset.ma]) b.textContent = presetMap[b.dataset.ma];
  });

  // Modal 2: Chicxulub Impact Lab
  const impactTitle = document.getElementById('impact-modal-title');
  if (impactTitle) impactTitle.textContent = s.impactModalTitle;
  const impactSub = document.querySelector('#impact-modal .modal-subtitle');
  if (impactSub) impactSub.textContent = s.impactModalSubtitle;
  const impactSliderLabel = document.querySelector('label[for="impact-stage-slider"]');
  if (impactSliderLabel && impactReadout) {
    impactSliderLabel.replaceChildren(s.impactSliderPrefix, impactReadout);
  }
  const impPresets = document.querySelectorAll('.impact-preset-btn');
  const impPresetMap = {
    '8': s.impactPreset1,
    '35': s.impactPreset2,
    '65': s.impactPreset3,
    '95': s.impactPreset4,
  };
  impPresets.forEach((b) => {
    if (impPresetMap[b.dataset.val]) b.textContent = impPresetMap[b.dataset.val];
  });

  // Modal 3: Quiz
  const quizTitle = document.getElementById('quiz-modal-title');
  if (quizTitle) quizTitle.textContent = s.quizModalTitle;
  const quizSub = document.querySelector('#quiz-modal .modal-subtitle');
  if (quizSub) quizSub.textContent = s.quizModalSubtitle;

  // Modal 4: Encyclopedia Atlas
  const atlasTitle = document.getElementById('atlas-modal-title');
  if (atlasTitle) atlasTitle.textContent = s.atlasModalTitle.replace('{count}', String(total));
  const atlasSub = document.querySelector('#atlas-modal .modal-subtitle');
  if (atlasSub) atlasSub.textContent = s.atlasModalSubtitle;
  if (atlasSearchInput) {
    atlasSearchInput.placeholder = s.atlasSearchPlaceholder;
    atlasSearchInput.setAttribute('aria-label', s.atlasSearchPlaceholder);
  }
  if (atlasEraSelect) {
    const opts = atlasEraSelect.querySelectorAll('option');
    opts.forEach((opt) => {
      if (opt.value === 'all') {
        opt.textContent = s.atlasEraAll.replace('{count}', String(total));
      } else {
        const eraObj = ERAS.find((e) => e.id === opt.value);
        if (eraObj) {
          const eLoc = getEraLoc(eraObj);
          opt.textContent = `${eraObj.number}. ${eLoc.name} (${eLoc.timeRange})`;
        }
      }
    });
  }
  if (atlasDietSelect) {
    const dietMap = {
      all: s.atlasDietAll,
      Carnivore: s.atlasDietCarnivore,
      Herbivore: s.atlasDietHerbivore,
      Ocean: s.atlasDietOcean,
      Sky: s.atlasDietSky,
    };
    atlasDietSelect.querySelectorAll('option').forEach((opt) => {
      if (dietMap[opt.value]) opt.textContent = dietMap[opt.value];
    });
  }
  if (atlasSortSelect) {
    const sortMap = {
      timeline: s.atlasSortTimeline,
      'size-desc': s.atlasSortSize,
      name: s.atlasSortName,
    };
    atlasSortSelect.querySelectorAll('option').forEach((opt) => {
      if (sortMap[opt.value]) opt.textContent = sortMap[opt.value];
    });
  }
}

export function applyLanguage(langCode) {
  const resolved = resolveSupportedLang(langCode);
  currentLang = resolved;
  audio.setLanguage(resolved);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, resolved);
  } catch {
    // Ignore storage restrictions
  }
  if (audio.isSpeaking) {
    audio.stopNarration(() => setNarrationButtonState(false, 'idle'));
  }

  applyStaticUiTranslations();
  updatePassportCounter();
  renderEraTabs();
  const activeEra = ERAS[engine.activeEraIndex] || ERAS.find((e) => e.id === engine.activeSpecies?.eraId);
  if (activeEra) {
    updateEraBanner(activeEra);
  }
  renderSpeciesRoster();
  if (engine.activeSpecies) {
    const era = ERAS.find((e) => e.id === engine.activeSpecies.eraId);
    updateInspectorPanel(engine.activeSpecies, era);
    updateMiniPaleoEarth(engine.activeSpecies, era);
    rebuildFloatingHotspotPins(engine.activeSpecies);
  }
  if (!driftModal.classList.contains('hidden')) {
    updateLargeDriftLab(driftMaSlider.value);
  }
  if (!impactModal.classList.contains('hidden')) {
    renderChicxulubSimulation(impactSlider.value);
  }
  if (!quizModal.classList.contains('hidden')) {
    renderQuizModal();
  }
  if (atlasModal && !atlasModal.classList.contains('hidden')) {
    renderAtlasModal();
  }
}

langSelect?.addEventListener('change', (e) => {
  applyLanguage(e.target.value);
});

// Close modals, dismiss toast, or exit Full View on Escape; press F to toggle Full View
window.addEventListener('keydown', (e) => {
  const tag = (e.target?.tagName || '').toLowerCase();
  const inField = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target?.isContentEditable;

  if (e.key === 'Escape') {
    driftModal.classList.add('hidden');
    impactModal.classList.add('hidden');
    quizModal.classList.add('hidden');
    atlasModal?.classList.add('hidden');
    whatifToast.classList.add('hidden');
    closeMobileSheet();
    if (isFullView) {
      setFullView(false);
    }
  } else if (!inField && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
    setFullView(!isFullView);
  }
});

// Boot Application
applyStaticUiTranslations();
initCookieConsent();
renderEraTabs();
renderSpeciesRoster();
engine.init();

// Read-only QA/debug handle (lets automated screenshot harnesses frame species & camera)
Object.defineProperty(window, 'dinoVerseDebug', {
  value: Object.freeze({ engine, applyLanguage }),
  writable: false,
  configurable: false,
});

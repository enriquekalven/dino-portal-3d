/**
 * Cookie consent for Google Analytics (opt-in, GDPR / ePrivacy style).
 *
 * Analytics stays off until the visitor clicks Accept. The choice is kept in
 * localStorage and can be changed any time from the 🍪 button in the top bar.
 * Banner text is localized by main.js (applyStaticUiTranslations).
 */
import { enableAnalytics, disableAnalytics } from './analytics.js';

const CONSENT_STORAGE_KEY = 'dinoverse-analytics-consent'; // 'granted' | 'denied'

function readChoice() {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function saveChoice(choice) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage blocked (e.g. private mode): the choice applies to this visit only.
  }
}

export function initCookieConsent() {
  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('btn-cookie-accept');
  const declineBtn = document.getElementById('btn-cookie-decline');
  const settingsBtn = document.getElementById('btn-cookie-settings');
  if (!banner || !acceptBtn || !declineBtn) return;

  let openedFromSettings = false;

  const setOpen = (open, { focus = false } = {}) => {
    banner.hidden = !open;
    settingsBtn?.setAttribute('aria-expanded', String(open));
    if (open && focus) banner.focus();
  };

  const choose = (choice) => {
    saveChoice(choice);
    if (choice === 'granted') enableAnalytics();
    else disableAnalytics();
    setOpen(false);
    if (openedFromSettings) settingsBtn?.focus();
    openedFromSettings = false;
  };

  acceptBtn.addEventListener('click', () => choose('granted'));
  declineBtn.addEventListener('click', () => choose('denied'));

  settingsBtn?.addEventListener('click', () => {
    const willOpen = banner.hidden;
    openedFromSettings = willOpen;
    setOpen(willOpen, { focus: willOpen });
  });

  // Escape closes the banner only once a choice exists (first visits must answer).
  banner.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && readChoice()) {
      setOpen(false);
      settingsBtn?.focus();
    }
  });

  const saved = readChoice();
  if (saved === 'granted') enableAnalytics();
  setOpen(!saved);
}

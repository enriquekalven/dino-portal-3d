/**
 * Google Analytics 4 (gtag.js) for the public DinoVerse 3D site.
 *
 * - Nothing loads until the visitor accepts analytics cookies (see consent.js).
 * - Runs only on the Firebase Hosting domains, so local development and
 *   automated screenshot runs never send hits.
 * - Kid-safe defaults: ad storage / personalization denied, Google Signals off.
 * - The site's Content-Security-Policy forbids inline scripts; the allowed GA
 *   hosts are listed in firebase.json.
 */
export const MEASUREMENT_ID = 'G-QHBKGFL45K'; // Firebase web app "dino-portal-3d" in project-maui
const PRODUCTION_HOSTS = ['dino-portal-3d.web.app', 'dino-portal-3d.firebaseapp.com'];
const DISABLE_FLAG = `ga-disable-${MEASUREMENT_ID}`;

let tagRequested = false;

function gtag() {
  // gtag.js expects the raw arguments object, not an array.
  window.dataLayer.push(arguments);
}

export function isAnalyticsHost(hostname = window.location.hostname) {
  return PRODUCTION_HOSTS.includes(hostname);
}

/** Starts (or resumes) measurement. Safe to call more than once. */
export function enableAnalytics() {
  if (!isAnalyticsHost()) return false;
  window[DISABLE_FLAG] = false;
  if (tagRequested) {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    return true;
  }
  tagRequested = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(tag);
  return true;
}

/** Stops measurement on this page and deletes any GA cookies already set. */
export function disableAnalytics() {
  window[DISABLE_FLAG] = true;
  if (tagRequested) gtag('consent', 'update', { analytics_storage: 'denied' });

  const host = window.location.hostname;
  for (const name of ['_ga', `_ga_${MEASUREMENT_ID.slice(2)}`]) {
    for (const domain of ['', host, `.${host}`]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

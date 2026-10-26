/**
 * Google Analytics 4 (gtag.js) for the public DinoVerse 3D site.
 *
 * - Runs only on the Firebase Hosting domains, so local development and
 *   automated screenshot runs never send hits.
 * - Kid-safe defaults: Google Signals and ad personalization are disabled.
 * - Lives in an external file because the site's Content-Security-Policy
 *   forbids inline scripts (see firebase.json for the allowed GA hosts).
 */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-QHBKGFL45K'; // Firebase web app "dino-portal-3d" in project-maui
  var PRODUCTION_HOSTS = ['dino-portal-3d.web.app', 'dino-portal-3d.firebaseapp.com'];

  if (PRODUCTION_HOSTS.indexOf(window.location.hostname) === -1) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  var tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(tag);
})();

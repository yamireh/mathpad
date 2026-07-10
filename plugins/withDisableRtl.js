const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Force the Android app to always lay out left-to-right, even on RTL-locale
 * devices (Arabic, Hebrew, …).
 *
 * MathPen's UI is English / number-based and is not localized for RTL, so when
 * Android mirrors the layout on an RTL device the alignment breaks (icons jump
 * to the wrong side, chip rows reverse, toggles flip). Setting
 * `android:supportsRtl="false"` on the <application> tells Android never to
 * mirror — the definitive native fix (the JS `I18nManager` lock in the app
 * entry reinforces it and covers iOS).
 *
 * Lives as a config plugin because the native `android/` project is generated
 * by prebuild (CNG) and a hand-edited manifest would be overwritten.
 */
module.exports = function withDisableRtl(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:supportsRtl'] = 'false';
    }
    return cfg;
  });
};

const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Strip the Android permissions + foreground services that `expo-audio` ships
 * in its library manifest but MathPen never uses.
 *
 * MathPen only plays SHORT in-app sound effects (`createAudioPlayer`, no
 * recording, no background/lock-screen playback). expo-audio's manifest,
 * however, declares audio RECORDING (microphone) and a media-playback
 * foreground service for background audio. Shipping those would:
 *   - request the MICROPHONE on a kids' app (a serious review red flag), and
 *   - trigger Play's FOREGROUND_SERVICE_MEDIA_PLAYBACK policy declaration
 *     (which we can't truthfully make — we do no background playback).
 *
 * So we remove them from the merged manifest via `tools:node="remove"`. Basic
 * playback (ExoPlayer) does not need any of these, so sound effects keep
 * working — verify after a rebuild.
 */
const REMOVE_PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
];

const REMOVE_SERVICES = [
  'expo.modules.audio.service.AudioControlsService',
  'expo.modules.audio.service.AudioRecordingService',
];

module.exports = function withTrimAudio(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    // Needed for the tools:node="remove" directives below.
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const name = (node) => node?.$?.['android:name'];

    // Drop any existing declaration, then add a remove directive so the copy
    // merged from expo-audio's library manifest is stripped too.
    manifest['uses-permission'] = (manifest['uses-permission'] || [])
      .filter((p) => !REMOVE_PERMISSIONS.includes(name(p)))
      .concat(
        REMOVE_PERMISSIONS.map((n) => ({
          $: { 'android:name': n, 'tools:node': 'remove' },
        })),
      );

    const app = manifest.application?.[0];
    if (app) {
      app.service = (app.service || [])
        .filter((s) => !REMOVE_SERVICES.includes(name(s)))
        .concat(
          REMOVE_SERVICES.map((n) => ({
            $: { 'android:name': n, 'tools:node': 'remove' },
          })),
        );
    }

    return cfg;
  });
};

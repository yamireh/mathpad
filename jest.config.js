/**
 * Jest configuration for MathPad.
 *
 * Uses the `jest-expo` preset (Expo SDK 54) so React Native + Expo modules
 * transform correctly, plus React Native Testing Library for component tests.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/react-native-skia|react-native-reanimated|react-native-worklets|react-native-safe-area-context|i18next|react-i18next))',
  ],
};

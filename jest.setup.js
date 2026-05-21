/**
 * Jest setup — runs before each test file.
 *
 * Mocks native modules that have no JS implementation in the test environment.
 */

// react-native-safe-area-context ships an official Jest mock that renders its
// components with zero insets. Its exports live on the module's `default`.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// AsyncStorage ships an official in-memory Jest mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The digital-ink native module has no JS implementation under Jest. Mock it so
// the recognition adapter (and anything that imports it) is testable; tests
// override the return values per case.
jest.mock('./modules/digital-ink', () => ({
  __esModule: true,
  default: {
    isModelDownloaded: jest.fn().mockResolvedValue(true),
    downloadModel: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue([]),
  },
}));

// Skia is a native binding with no JS runtime under Jest. A light mock lets ink
// components render; actual drawing is verified on-device, not in Jest.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const makePath = () => ({ moveTo: jest.fn(), lineTo: jest.fn() });
  return {
    Skia: { Path: { Make: makePath } },
    Canvas: ({ children }) => React.createElement(View, null, children),
    Path: () => null,
  };
});

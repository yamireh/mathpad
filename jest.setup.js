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

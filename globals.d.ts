/**
 * Ambient declarations for test-only globals.
 *
 * `__expoRouterParams` is set by tests and read by the expo-router mock in
 * jest.setup.js to supply route params.
 */
declare global {
  // eslint-disable-next-line no-var
  var __expoRouterParams: Record<string, string> | undefined;
}

export {};

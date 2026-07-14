/** Custom hooks — stateful logic and side effects. */
export {
  useForceUpdate,
  type UseForceUpdateResult,
} from './useForceUpdate';
export { useDevPreferences } from './useDevPreferences';
export {
  DeviceRoleProvider,
  useDeviceRole,
  type DeviceRoleContextValue,
} from './useDeviceRole';
export { useAuthUser, type AuthUserState } from './useAuthUser';
export { useFamily, type FamilyState } from './useFamily';
export { useDashboard, type DashboardState } from './useDashboard';
export {
  FamilyLinkProvider,
  useFamilyLink,
  type FamilyLinkContextValue,
} from './useFamilyLink';
export {
  useParentalGate,
  type UseParentalGateResult,
} from './useParentalGate';
export { useHowToDemo } from './useHowToDemo';
export { useSettings, type UseSettingsResult } from './useSettings';
export { useHistory, type UseHistoryResult } from './useHistory';
export { useSyncFlush } from './useSyncFlush';
export { useVerifyLink } from './useVerifyLink';
export { useTimer, type UseTimerResult } from './useTimer';
export {
  useRecognition,
  type AnswerRecognizer,
  type RecognitionStatus,
  type UseRecognitionResult,
} from './useRecognition';
export {
  PracticeSessionProvider,
  usePracticeSession,
  type PracticeSessionContextValue,
  type SessionData,
} from './usePracticeSession';
export {
  PurchasesProvider,
  usePurchases,
  type PurchasesContextValue,
} from './usePurchases';
export {
  TipsProvider,
  useTip,
  useResetTips,
  type UseTipResult,
} from './useTips';

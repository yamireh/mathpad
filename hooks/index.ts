/** Custom hooks — stateful logic and side effects. */
export { useSettings, type UseSettingsResult } from './useSettings';
export { useHistory, type UseHistoryResult } from './useHistory';
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

/** Clock module — pure logic (time generation, formatting, geometry). */
export type {
  ClockTime,
  ClockStep,
  ClockAnswerType,
  ClockPhrase,
} from './types';
export { STEP_MINUTES, generateClockTime } from './generate';
export {
  formatDigital,
  clockPhrase,
  handAngles,
  pointOnClock,
} from './format';
export type {
  ClockWord,
  ClockToken,
  ClockQuestion,
  ClockAnswerSurface,
} from './question';
export type { ClockSettings, ClockResult, ClockSession } from './settings';
export { defaultClockSettings, summariseClockSession } from './settings';
export {
  phraseTokens,
  tokensEqual,
  patternBank,
  checkDigital,
  checkPattern,
  checkSet,
  digitalAnswer,
  resolveAnswerWith,
  generateClockQuestions,
} from './question';

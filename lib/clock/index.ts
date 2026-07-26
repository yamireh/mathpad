/** Clock module — pure logic (time generation, formatting, geometry). */
export type {
  ClockTime,
  ClockStep,
  ClockComplexity,
  ClockSkill,
  ClockDirection,
  ClockJump,
  ClockAnswerType,
  ClockPhrase,
} from './types';
export {
  STEP_MINUTES,
  generateClockTime,
  resolveStep,
  resolveJump,
  shiftTime,
} from './generate';
export {
  formatDigital,
  clockPhrase,
  handAngles,
  pointOnClock,
} from './format';
export type {
  ClockWord,
  ClockToken,
  PatternSections,
  ClockQuestion,
  ClockAnswerSurface,
} from './question';
export { surfacesForSkill } from './question';
export type { ClockSettings, ClockResult, ClockSession } from './settings';
export { defaultClockSettings, summariseClockSession } from './settings';
export {
  phraseTokens,
  tokensEqual,
  patternBank,
  patternSections,
  checkDigital,
  checkPattern,
  checkSet,
  digitalAnswer,
  resolveAnswerWith,
  generateClockQuestions,
} from './question';

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
export type { ClockWord, ClockToken, ClockQuestion } from './question';
export {
  phraseTokens,
  tokensEqual,
  patternBank,
  checkDigital,
  checkPattern,
  digitalAnswer,
  resolveAnswerWith,
  generateClockQuestions,
} from './question';

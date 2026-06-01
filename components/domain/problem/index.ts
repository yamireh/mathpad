/**
 * Per-operation problem components. `ProblemDisplay` is the dispatcher that
 * picks the right one by layout + operation; the individual components are
 * exported for direct use and future feature work (e.g. division carries).
 */
export { ProblemDisplay, type ProblemDisplayProps } from './ProblemDisplay';
export { AdditionProblem, type AdditionProblemProps } from './AdditionProblem';
export {
  SubtractionProblem,
  type SubtractionProblemProps,
} from './SubtractionProblem';
export {
  MultiplicationProblem,
  type MultiplicationProblemProps,
} from './MultiplicationProblem';
export { DivisionProblem, type DivisionProblemProps } from './DivisionProblem';

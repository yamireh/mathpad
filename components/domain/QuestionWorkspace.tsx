/**
 * QuestionWorkspace — kept as a thin re-export for callers that still
 * import from this path (`practice.tsx`, `review/[index].tsx`, the
 * `components/domain` barrel). The actual implementation now lives in
 * `components/panels/OperationsPanel/workspace/OperationsWorkspace`,
 * which dispatches to per-operation panels (Addition, Subtraction,
 * Multiplication, Division).
 */
export {
  OperationsWorkspace as QuestionWorkspace,
  type OperationsWorkspaceHandle as QuestionWorkspaceHandle,
  type OperationsWorkspaceProps as QuestionWorkspaceProps,
} from '../panels/OperationsPanel/workspace';

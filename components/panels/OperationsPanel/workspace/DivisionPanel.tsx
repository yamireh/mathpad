import { DivisionBody, type WorkspaceCore } from '../../../domain/workspace';

/**
 * DivisionPanel — division's per-operation surface. Long-division and
 * inline (in-row / decimal) layouts are both rendered by `DivisionBody`,
 * which picks between them via `core.isLongDivision`. Future
 * division-only chrome (e.g. a "show remainder as fraction" toggle)
 * lives here.
 */
export function DivisionPanel({ core }: { core: WorkspaceCore }) {
  return <DivisionBody core={core} />;
}

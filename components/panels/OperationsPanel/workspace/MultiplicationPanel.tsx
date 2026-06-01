import { CompactBody, type WorkspaceCore } from '../../../domain/workspace';

/**
 * MultiplicationPanel — multiplication's per-operation surface. Renders
 * the shared `CompactBody`; partial-product + times-carry rows are
 * surfaced via `core.partialShape` / `core.multInfo` inside
 * `ProblemDisplay`. Future multiplication-only chrome (e.g. lattice or
 * area-model toggles) lives here.
 */
export function MultiplicationPanel({ core }: { core: WorkspaceCore }) {
  return <CompactBody core={core} />;
}

import { CompactBody, type WorkspaceCore } from '../../../domain/workspace';

/**
 * SubtractionPanel — subtraction's per-operation surface. Renders the
 * shared `CompactBody`; the borrow-tap interaction is wired through
 * `core.onToggleBorrow` and rendered inside `ProblemDisplay`. Future
 * subtraction-only chrome (e.g. negative-answer hints) lives here.
 */
export function SubtractionPanel({ core }: { core: WorkspaceCore }) {
  return <CompactBody core={core} />;
}

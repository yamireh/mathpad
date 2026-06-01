import { CompactBody, type WorkspaceCore } from '../../../domain/workspace';

/**
 * AdditionPanel — addition's per-operation surface. Today this is a
 * straight render of `CompactBody`; the file exists as the natural home
 * for any future addition-only chrome (e.g. addition-specific tips,
 * column-summing hints, decimal-point alignment helpers).
 */
export function AdditionPanel({ core }: { core: WorkspaceCore }) {
  return <CompactBody core={core} />;
}

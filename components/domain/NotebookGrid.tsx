import { useMemo } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';

/** Notebook grid spacing, in px. */
const GRID_STEP = 26;
/** Faint graph-paper line colour. */
const GRID_COLOR = 'rgba(99, 112, 121, 0.10)';

export interface NotebookGridProps {
  width: number;
  height: number;
}

/**
 * Faint graph-paper grid drawn behind ink. Render it *inside* a Skia `Canvas`
 * (it returns a Skia `Path`), passing the surface's measured size so the
 * writing/scratch areas read like a math notebook page.
 */
export function NotebookGrid({ width, height }: NotebookGridProps) {
  const path = useMemo(() => {
    if (width <= 0 || height <= 0) return null;
    const p = Skia.Path.Make();
    for (let x = GRID_STEP; x < width; x += GRID_STEP) {
      p.moveTo(x, 0);
      p.lineTo(x, height);
    }
    for (let y = GRID_STEP; y < height; y += GRID_STEP) {
      p.moveTo(0, y);
      p.lineTo(width, y);
    }
    return p;
  }, [width, height]);

  if (!path) return null;
  return <Path path={path} color={GRID_COLOR} style="stroke" strokeWidth={1} />;
}

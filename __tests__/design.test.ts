import {
  colors,
  design,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../constants/design';

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('design tokens', () => {
  it('exposes the neutral colour base', () => {
    expect(colors.background).toMatch(HEX);
    expect(colors.surface).toMatch(HEX);
    expect(colors.text).toMatch(HEX);
    expect(colors.textMuted).toMatch(HEX);
    expect(colors.border).toMatch(HEX);
  });

  it('exposes correct (green) and wrong (coral) marking colours', () => {
    expect(colors.correct).toMatch(HEX);
    expect(colors.wrong).toMatch(HEX);
  });

  it('defines an accent and tint for every operation', () => {
    const operations = [
      'addition',
      'subtraction',
      'multiplication',
      'division',
      'mix',
    ] as const;

    for (const operation of operations) {
      expect(operationColors[operation].accent).toMatch(HEX);
      expect(operationColors[operation].tint).toMatch(HEX);
    }
  });

  it('reuses the coral accent for wrong answers (per SPEC)', () => {
    expect(colors.wrong).toBe(operationColors.subtraction.accent);
  });

  it('exposes exactly two font weights', () => {
    expect(typography.weight.regular).toBe('400');
    expect(typography.weight.medium).toBe('500');
  });

  it('exposes positive spacing, radius and shadow scales', () => {
    expect(spacing.md).toBeGreaterThan(0);
    expect(radius.md).toBeGreaterThan(0);
    expect(radius.pill).toBeGreaterThan(radius.xl);
    expect(shadows.md.elevation).toBeGreaterThan(0);
  });

  it('aggregates every token group under `design`', () => {
    expect(design.colors).toBe(colors);
    expect(design.operationColors).toBe(operationColors);
    expect(design.typography).toBe(typography);
    expect(design.spacing).toBe(spacing);
    expect(design.radius).toBe(radius);
    expect(design.shadows).toBe(shadows);
  });
});

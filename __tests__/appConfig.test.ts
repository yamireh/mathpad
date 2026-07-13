import {
  DEFAULT_MAX_HISTORY,
  DEFAULT_MIN_VERSION,
  appStoreUrl,
  compareVersions,
  isUpdateRequired,
  parseAppConfig,
} from '../lib/appConfig';

describe('compareVersions', () => {
  it('orders by numeric segments', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });
  it('treats missing trailing parts as zero', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.1', '1.0.5')).toBe(1);
  });
  it('treats garbage segments as zero (never falsely forces an update)', () => {
    expect(compareVersions('1.x', '1.0.0')).toBe(0);
  });
});

describe('parseAppConfig', () => {
  it('reads a well-formed iOS block', () => {
    const c = parseAppConfig({ ios: { minVersion: '1.2.0', appStoreId: '12345' } });
    expect(c).toEqual({
      minVersion: '1.2.0',
      appStoreId: '12345',
      maxHistorySessionsPerChild: DEFAULT_MAX_HISTORY,
    });
  });
  it('falls back to safe defaults on missing/garbage', () => {
    expect(parseAppConfig({})).toEqual({
      minVersion: DEFAULT_MIN_VERSION,
      appStoreId: null,
      maxHistorySessionsPerChild: DEFAULT_MAX_HISTORY,
    });
    expect(parseAppConfig(null)).toEqual({
      minVersion: DEFAULT_MIN_VERSION,
      appStoreId: null,
      maxHistorySessionsPerChild: DEFAULT_MAX_HISTORY,
    });
    expect(parseAppConfig({ ios: { appStoreId: 'not-numeric' } }).appStoreId).toBeNull();
  });
  it('reads and clamps the history cap tunable', () => {
    expect(parseAppConfig({ maxHistorySessionsPerChild: 120 }).maxHistorySessionsPerChild).toBe(120);
    expect(parseAppConfig({ maxHistorySessionsPerChild: 99999 }).maxHistorySessionsPerChild).toBe(500);
    expect(parseAppConfig({ maxHistorySessionsPerChild: 0 }).maxHistorySessionsPerChild).toBe(DEFAULT_MAX_HISTORY);
    expect(parseAppConfig({ maxHistorySessionsPerChild: 'lots' }).maxHistorySessionsPerChild).toBe(DEFAULT_MAX_HISTORY);
  });
});

describe('isUpdateRequired', () => {
  it('requires an update only when installed is below minimum', () => {
    expect(isUpdateRequired('1.0.0', '1.1.0')).toBe(true);
    expect(isUpdateRequired('1.1.0', '1.1.0')).toBe(false);
    expect(isUpdateRequired('1.2.0', '1.1.0')).toBe(false);
  });
  it('never blocks when the installed version is unknown', () => {
    expect(isUpdateRequired(null, '9.9.9')).toBe(false);
  });
});

describe('appStoreUrl', () => {
  it('builds an id deep link, but not for the placeholder/null', () => {
    expect(appStoreUrl('12345')).toBe('https://apps.apple.com/app/id12345');
    expect(appStoreUrl('0000000000')).toBeNull();
    expect(appStoreUrl(null)).toBeNull();
  });
});

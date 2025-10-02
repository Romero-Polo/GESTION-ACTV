export const VERSION = '0.1.1 beta';
export const VERSION_DATE = '2025-09-28';
export const BUILD_NUMBER = '002';

export const getVersionInfo = () => ({
  version: VERSION,
  date: VERSION_DATE,
  build: BUILD_NUMBER,
  fullVersion: `v${VERSION} (${VERSION_DATE})`,
});
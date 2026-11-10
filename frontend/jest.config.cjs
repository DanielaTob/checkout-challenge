/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.(test|spec).ts?(x)'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }] },
  moduleNameMapper: {
    '\\.(css)$': 'identity-obj-proxy',
    '\\.(png|jpe?g|webp|svg)$': '<rootDir>/src/test/fileMock.cjs',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx', '!src/test/**', '!src/**/*.d.ts'],
  coverageReporters: ['text-summary', 'text', 'lcov', 'json-summary'],
  coverageThreshold: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
};

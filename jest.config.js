module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': [
      'esbuild-jest',
      {
        sourcemap: true,
        target: 'ESNext',
      },
    ],
  },
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['jest-extended/all'],
};

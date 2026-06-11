/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  roots: ['<rootDir>/src'],
  clearMocks: true,
};

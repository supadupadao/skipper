import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    workerThreads: true,
    maxWorkers: 1,
    testEnvironment: '@ton/sandbox/jest-environment',
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    reporters: [
         'default',
         ['@ton/sandbox/jest-reporter', {}],
    ]
};

export default config;

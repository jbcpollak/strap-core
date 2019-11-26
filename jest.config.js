'use strict';
const reporters = ['default'];

if (process.env.CI) {
	reporters.push([
		'jest-junit',
		{
			output: './reports/jest/results.xml',
		},
	]);
}

module.exports = {
	'globals': {
		'ts-jest': {
			'tsConfigFile': 'tsconfig.spec.json',
		},
	},
	'moduleFileExtensions': [
		'ts',
		'js',
		'json',
	],
	'transform': {
		'^.+\\.tsx?$': '<rootDir>/node_modules/ts-jest/preprocessor.js',
	},
	'testRegex': '/src/.*\\.(spec).(ts)$',
	'collectCoverage': true,
	'coverageDirectory': 'coverage',
	'collectCoverageFrom': [
		'src/**/*.ts',
		'!**/node_modules/**',
		'!**/vendor/**',
	],
	'coverageReporters': [
		'json',
		'lcov',
		'html',
	],
	reporters,
};

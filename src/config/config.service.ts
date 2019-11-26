import {Injectable} from '@nestjs/common';
import {Logger} from 'pino';
import * as fs from 'fs';
import * as json5 from 'json5';

import {
	isNumber,
	isString,
	isObjectWithDefinition,
	requiredProperty,
	ReasonGuard,
	hasArrayProperty,
	optionalProperty,
} from '@6river/reason-guard';

import {PinoLoggerService} from '../logger/logger.service';
import {DoesNotExistError} from '../errors/does-not-exist-error';

/* Todo: this can be further generalized to ArtifactoryConfig & GitHubConfig and then using reason-guard
    to determine if the respective modules should be loaded
*/
export interface ArtifactoryConfig {
	// Names of groups that the user should be in before downloading this script
	artifactoryGroups: string[];

	// Base URL of the hosted Artifactory instance, i.e. https://foo.jfrog.io/artifactory/ (include trailing slash)
	artifactoryBaseUrl: string;

	// OAuth token for an Artifactory user with admin privileges
	artifactoryToken: string;

	// Artifactory NPM repository name
	artifactoryNpmRepoName: string;

	// Artifactory NPM package scope name
	artifactoryNpmPackageScope: string;
}

export interface GitHubConfig {
	// Logins of organizations that the user should be in before downloading this script
	organizationLogins: string[];

	/**
	 * IDs of teams that the user may be in before downloading this script
	 * To get the IDs of all teams in the organization:
	 * curl -u [GitHub username]:[personal access token] https://api.github.com/orgs/6RiverSystems/teams
	 */
	teamIds: number[];

	// GitHub application credentials
	gitHubKey: string;
	gitHubSecret: string;
}

export interface Config extends ArtifactoryConfig, GitHubConfig {
	customScript?: string;
 }

// TODO: Lift to reason-guard
export function throwOnErrorGuard<T>(guard: ReasonGuard<unknown, T>):
	ReasonGuard<unknown, T> {
	return (input: any): input is T => {
		const errors: Error[] = [];

		const success = guard(input, errors);

		if (success) {
			return success;
		} else {
			throw errors[0] || new Error('Guard failed but did not emit an error');
		}
	};
}

const isConfig = isObjectWithDefinition<Config>({
	organizationLogins: hasArrayProperty(isString),
	teamIds: hasArrayProperty(isNumber),
	gitHubKey: requiredProperty(isString),
	gitHubSecret: requiredProperty(isString),
	artifactoryGroups: hasArrayProperty(isString),
	artifactoryBaseUrl: requiredProperty(isString),
	artifactoryToken: requiredProperty(isString),
	artifactoryNpmRepoName: requiredProperty(isString),
	artifactoryNpmPackageScope: requiredProperty(isString),
	customScript: optionalProperty(isString),
});

export const assertIsConfig = throwOnErrorGuard(isConfig);

@Injectable()
export class ConfigService {
	private readonly logger: Logger;
	public readonly config: Config;

	constructor(
		logger: PinoLoggerService,
	) {
		this.logger = logger.child('ConfigService');

		try {
			const loadedConfig = json5.parse(fs.readFileSync('config.json5').toString());

			const defaultConfig = {
				// Get environment variables, explicitly set properties to null when the value is undefined
				artifactoryToken: process.env.ARTIFACTORY_TOKEN,
				artifactoryBaseUrl: process.env.ARTIFACTORY_URL,
				gitHubKey: process.env.GITHUB_KEY,
				gitHubSecret: process.env.GITHUB_SECRET,
			};

			const composedConfig = Object.assign({}, defaultConfig, loadedConfig);

			assertIsConfig(composedConfig);

			this.config = composedConfig;
		} catch (err) {
			if (err instanceof DoesNotExistError) {
				this.logger.debug(err.message);
			}

			throw err;
		}
	}
}

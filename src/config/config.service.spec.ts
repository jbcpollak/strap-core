import {assertIsConfig, Config} from './config.service';

describe('ConfigService', function() {
	describe('isObjectWithDefinition', function() {
		it('should accept a valid config file', function() {
			const config: Config = {
				artifactoryGroups: ['reader'],
				artifactoryBaseUrl: 'http://artifactory.example.com',
				artifactoryToken: '242934203ca32bd',
				artifactoryNpmRepoName: 'npm-local',
				artifactoryNpmPackageScope: 'orgscope',
				organizationLogins: ['MyCompany'],
				teamIds: [2343222],
				gitHubKey: 'github user key',
				gitHubSecret: 'github secret key',
			};

			assertIsConfig(config);
		});
	});
});

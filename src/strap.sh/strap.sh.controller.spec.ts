import {StrapShController} from './strap.sh.controller';
import {Logger} from 'pino';
import {OAuthService} from '../interfaces/OAuthService';

import {Response} from 'express';
import {GitHubServiceFactory} from '../github/github.service.factory';
import {GitHubService} from '../github/github.service';
import {StrapShService} from './strap.sh.service';
import {ConfigService, Config} from '../config/config.service';
import {PinoLoggerService} from '../logger/logger.service';

describe('StrapShController', () => {
	const oauth: OAuthService = {
		authenticate(): Response {
			throw new Error('Method not implemented');
		},
	};

	const ghServiceFactory: Partial<GitHubServiceFactory> = {
		makeGitHubService(): GitHubService {
			throw new Error('Method not implemented');
		},
	};

	const strapShService: Partial<StrapShService> = {
		loadScript(): string {
			return '';
		},
	};

	const configService: Partial<ConfigService> = {
		config: {} as Config,
	};

	let strapShController: StrapShController;

	const logService: Partial<PinoLoggerService> = {
		child(): Logger {
			return {
				debug: (msg: string) => console.log(msg),
			} as Logger;
		},
	};

	beforeEach(() => {
		strapShController = new StrapShController(
			oauth,
			ghServiceFactory as GitHubServiceFactory,
			logService as PinoLoggerService,
			strapShService as StrapShService,
			configService as ConfigService,
		);
	});

	describe('getScriptData', () => {
		it('should return sensible data', async () => {
			const token = 'testToken';

			const response = {

			} as Response;

			const result = await strapShController.getScriptData(
				token,
				response,
			);

			expect(result).toBeDefined();
		});
	});
});

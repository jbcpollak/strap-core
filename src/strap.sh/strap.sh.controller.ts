import {Controller, Get, HttpException, HttpStatus, Render, Res, Session, Inject} from '@nestjs/common';
import {Response} from 'express';
import {Logger} from 'pino';

import * as fs from 'fs';

import {GitHubService} from '../github/github.service';
import {GitHubServiceFactory} from '../github/github.service.factory';
import {ISession} from '../interfaces/session';
import {StrapShService} from './strap.sh.service';
import {ConfigService} from '../config/config.service';
import {OAuthService} from '../interfaces/OAuthService';
import {PinoLoggerService} from '../logger/logger.service';

@Controller()
export class StrapShController {
	private readonly logger: Logger;
	private readonly script: string;
	private readonly customScript: string;
	private readonly artifactoryBaseUrl: string;
	private readonly artifactoryNpmRepoName: string;
	private readonly artifactoryNpmPackageScope: string;

	constructor(
		@Inject('OAuthService') private readonly gitHubAuth: OAuthService,
		private readonly gitHubServiceFactory: GitHubServiceFactory,
		logger: PinoLoggerService,
		private readonly strapShService: StrapShService,
		configService: ConfigService,
	) {
		this.logger = logger.child('StrapShController');
		this.script = this.strapShService.loadScript();

		if (configService.config.customScript) {
			this.customScript = fs.readFileSync(configService.config.customScript).toString();
		} else {
			this.customScript = '';
		}

		this.artifactoryBaseUrl = configService.config.artifactoryBaseUrl;
		this.artifactoryNpmRepoName = configService.config.artifactoryNpmRepoName;
		this.artifactoryNpmPackageScope = configService.config.artifactoryNpmPackageScope;
	}

	async getScriptData(token: string | undefined, res: Response) {
		if (!token) {
			return this.gitHubAuth.authenticate(res);
		}

		const gitHubService: GitHubService = this.gitHubServiceFactory.makeGitHubService(token);

		try {
			const [teamInfo, userCredentials] = await Promise.all([
				gitHubService.getTeamInfo(),
				gitHubService.getUserCredentials(),
			]);

			const teamSlugs = teamInfo
				.filter((t) => t.isMember)
				.map((t) => t.slug)
				.join();

			return {
				...userCredentials,
				repoSets: teamSlugs,
				gitHubToken: token,
				artifactoryBaseUrl: this.artifactoryBaseUrl,
				artifactoryNpmRepoName: this.artifactoryNpmRepoName,
				artifactoryNpmPackageScope: this.artifactoryNpmPackageScope,
				script: this.script,
				customScript: this.customScript,
			};
		} catch (err) {
			this.logger.debug(err, 'could not access the GitHub API');
			throw new HttpException('could not access the GitHub API', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Get('strap.sh')
	@Render('strap')
	async download(@Res() res: Response, @Session() session: ISession) {
		session.redirectTo = '/strap.sh';

		res.setHeader('Content-Type', 'application/octet-stream');
		return await this.getScriptData(session.token, res);
	}

	@Get('strap.sh/preview')
	@Render('strap')
	async preview(@Res() res: Response, @Session() session: ISession) {
		session.redirectTo = '/strap.sh/preview';

		res.setHeader('Content-Type', 'text/plain');
		return await this.getScriptData(session.token, res);
	}
}

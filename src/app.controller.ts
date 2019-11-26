import {Controller, Get, HttpException, HttpStatus, Query, Render, Res, Session, Inject} from '@nestjs/common';
import {Response} from 'express';
import {Logger} from 'pino';

import {ArtifactoryService} from './artifactory/artifactory.service';
import {GitHubAuth} from './github/github.auth';
import {GitHubServiceFactory} from './github/github.service.factory';
import {ISession} from './interfaces/session';
import {PinoLoggerService} from './logger/logger.service';
import {OrganizationInfo} from './github/organization-info';
import {TeamInfo} from './github/team-info';
import {ArtifactoryGroupInfo} from './artifactory/artifactory-group-info';

@Controller()
export class AppController {
	private readonly logger: Logger;

	constructor(
		private readonly artifactoryService: ArtifactoryService,
		@Inject('OAuthService') private readonly gitHubAuth: GitHubAuth,
		private readonly gitHubServiceFactory: GitHubServiceFactory,
		logger: PinoLoggerService,
	) {
		this.logger = logger.child('AppController');
	}

	@Get()
	@Render('index')
	async root(@Res() res: Response, @Session() session: ISession) {
		if (!session.token) {
			session.redirectTo = '/';
			this.logger.info(`no GitHub token found in session; authenticating with GitHub`);
			return this.gitHubAuth.authenticate(res);
		}

		const gitHubService = this.gitHubServiceFactory.makeGitHubService(session.token);

		let teamInfo: TeamInfo[] = [];
		let orgInfo: OrganizationInfo[];
		let userCredentials;
		let artifactoryGroups: ArtifactoryGroupInfo[] = [];
		let isArtifactoryUser = false;

		try {
			[orgInfo, userCredentials] = await Promise.all([
				gitHubService.getOrgInfo(),
				gitHubService.getUserCredentials(),
			]);
			// Only attempt to get team info if the user is a member of all organizations (otherwise it will fail)
			if (orgInfo.every((orgInfo) => orgInfo.isMember)) {
				teamInfo = await gitHubService.getTeamInfo();
			}
		} catch (err) {
			this.logger.debug(err, 'could not access the GitHub API');
			throw new HttpException('could not access the GitHub API', HttpStatus.INTERNAL_SERVER_ERROR);
		}

		try {
			isArtifactoryUser = await this.artifactoryService.isUser(userCredentials.gitHubUser);

			if (isArtifactoryUser) {
				artifactoryGroups = await this.artifactoryService.isInGroups(userCredentials.gitHubUser);
			}
		} catch (err) {
			this.logger.debug(err, 'could not access the Artifactory API');
			throw new HttpException('could not access the Artifactory API', HttpStatus.INTERNAL_SERVER_ERROR);
		}

		return {
			profile: userCredentials,
			organizations: orgInfo,
			teams: teamInfo,
			isInAnyTeams: teamInfo.some((team) => team.isMember),
			isArtifactoryUser,
			artifactoryGroups,
			artifactoryBaseUrl: this.artifactoryService.baseUrl(),
		};
	}

	@Get('auth/github/callback')
	async callback(@Query('code') code: string, @Res() res: Response, @Session() session: ISession) {
		if (!code) {
			throw new HttpException('failed to authenticate; did not receive code from GitHub', HttpStatus.BAD_REQUEST);
		}
		try {
			session.token = await this.gitHubAuth.getAuthToken(code);
			this.logger.info('got GitHub auth token; adding to session and redirecting');
			res.redirect(session.redirectTo || '/');
			session.redirectTo = undefined;
		} catch (err) {
			throw new HttpException('failed to authenticate with GitHub', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}

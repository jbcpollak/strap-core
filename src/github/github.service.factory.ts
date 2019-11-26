import {Injectable} from '@nestjs/common';

import {PinoLoggerService} from '../logger/logger.service';
import {GitHubSource} from './github-source';
import {GitHubService} from './github.service';
import {ConfigService} from '../config/config.service';

@Injectable()
export class GitHubServiceFactory {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: PinoLoggerService,
	) {}

	makeGitHubService(token: string) {
		const gitHub = new GitHubSource(token, this.logger);
		return new GitHubService(gitHub, this.logger, this.configService);
	}
}

import {Injectable} from '@nestjs/common';
import {Logger} from 'pino';

import {ArtifactorySource} from './artifactory-source';
import {ArtifactoryUser} from './artifactory-user';
import {PinoLoggerService} from '../logger/logger.service';
import {getAll} from '../utils/get-all';
import {DoesNotExistError} from '../errors/does-not-exist-error';
import {ArtifactoryConfig, ConfigService} from '../config/config.service';
import {ArtifactoryGroupInfo} from './artifactory-group-info';

@Injectable()
export class ArtifactoryService {
	private readonly logger: Logger;
	private readonly config: ArtifactoryConfig;

	constructor(
		private readonly artifactory: ArtifactorySource,
		configService: ConfigService,
		logger: PinoLoggerService,
	) {
		this.logger = logger.child('ArtifactoryService');

		this.config = configService.config;
	}

	async isUser(username: string): Promise<boolean> {
		try {
			await this.artifactory.getUser(username);
			return true;
		} catch (err) {
			if (err instanceof DoesNotExistError) {
				this.logger.debug(err.message);
			}
			return false;
		}
	}

	baseUrl(): string {
		return this.config.artifactoryBaseUrl;
	}

	async isInGroup(username: string, group: string): Promise<boolean> {
		const user: ArtifactoryUser = await this.artifactory.getUser(username);
		return user.groups && user.groups.includes(group);
	}

	async isInGroups(username: string): Promise<ArtifactoryGroupInfo[]> {
		const groups = this.config.artifactoryGroups;

		const inGroups = await getAll<string, boolean>(
			groups, this.isInGroup.bind(this, username)
		);

		return this.config.artifactoryGroups.map((name, index) => ({
			name,
			isMember: inGroups[index],
		}));
	}
}

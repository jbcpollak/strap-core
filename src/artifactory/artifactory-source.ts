import {Injectable} from '@nestjs/common';
import {AxiosInstance, AxiosResponse, AxiosError} from 'axios';
import {Logger} from 'pino';

import {ArtifactoryUser} from './artifactory-user';
import {AxiosHttpService} from '../http/http.service';
import {PinoLoggerService} from '../logger/logger.service';
import {DoesNotExistError} from '../errors/does-not-exist-error';
import {ConfigService, ArtifactoryConfig} from '../config/config.service';

@Injectable()
export class ArtifactorySource {
	private readonly axios: AxiosInstance;
	private readonly logger: Logger;

	constructor(
		logger: PinoLoggerService,
		configService: ConfigService,
		axiosHttpService: AxiosHttpService,
	) {
		this.logger = logger.child('ArtifactorySource');

		const config: ArtifactoryConfig = configService.config;

		if (config.artifactoryBaseUrl && config.artifactoryToken) {
			const axiosConfig = {
				baseURL: `${config.artifactoryBaseUrl}api/`,
				headers: {
					'X-JFrog-Art-Api': config.artifactoryToken,
				},
			};
			this.axios = axiosHttpService.create(axiosConfig);
			this.logger.debug(config, 'Axios config');
		} else {
			throw new Error('Artifactory base URL or token is not set');
		}
	}

	async getUser(username: string): Promise<ArtifactoryUser> {
		this.logger.info(`getting user with username ${username}`);
		try {
			const {data, status, statusText}: AxiosResponse<ArtifactoryUser> = await this.axios(`security/users/${username}`);
			this.logger.debug(data, `got Artifactory user with response ${status} ${statusText}`);
			return data;
		} catch (err) {
			const error: AxiosError = err;
			if (error.response && error.response.status === 404) {
				throw new DoesNotExistError(`Artifactory user "${username}" does not exist`);
			} else {
				let code;
				if (err.data && err.data.errors) {
					code = err.data.errors[0].status;
				}
				this.logger.error({code, message: err.message}, 'failed to get Artifactory user');
				throw err;
			}
		}
	}
}

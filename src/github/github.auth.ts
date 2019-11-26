import {Injectable} from '@nestjs/common';
import {AxiosInstance} from 'axios';
import {Response} from 'express';
import {Logger} from 'pino';
import {stringify as buildQueryParams} from 'querystring';

import {AxiosHttpService} from '../http/http.service';
import {PinoLoggerService} from '../logger/logger.service';
import {ConfigService, GitHubConfig} from '../config/config.service';
import {OAuthService} from '../interfaces/OAuthService';

@Injectable()
export class GitHubAuth implements OAuthService {
	private axios: AxiosInstance;
	public clientId: string;
	private clientSecret: string;
	private readonly logger: Logger;

	constructor(
		configService: ConfigService,
		axiosService: AxiosHttpService,
		logger: PinoLoggerService,
	) {
		this.axios = axiosService.axios;
		this.logger = logger.child('GitHubAuth');

		const config: GitHubConfig = configService.config;

		if (config.gitHubKey === null || config.gitHubSecret === null) {
			throw new Error('Missing GitHub Key or Secret');
		}

		this.clientId = config.gitHubKey;
		this.clientSecret = config.gitHubSecret;
	}

	/**
	 * Redirect to authenticate with GitHub
	 */
	public authenticate(res: Response): Response {
		const base = 'https://github.com/login/oauth/authorize?';
		const params = {
			'client_id': this.clientId,
			'scope': 'user:email repo',
		};
		const url = base + buildQueryParams(params);
		this.logger.info(`redirecting to ${url}`);
		res.redirect(url);

		return res;
	}

	/**
	 * Get an auth token
	 * @param code single-use GitHub code for retrieving an OAuth token
	 */
	async getAuthToken(code: string): Promise<string> {
		this.logger.info('getting GitHub auth token from code');
		const url = 'https://github.com/login/oauth/access_token';
		const payload = {
			client_id: this.clientId,
			client_secret: this.clientSecret,
			code,
		};
		try {
			const config = {headers: {accept: 'application/json'}};
			this.logger.trace({url, payload}, 'token request');

			const {data, status, statusText} = await this.axios.post(url, payload, config);

			this.logger.info(`GitHub auth token request got response %d %s`, status, statusText);
			this.logger.trace({data}, 'token response');

			if (data.error) {
				const error = new Error(data.error_description);
				error.name = data.error;
				error.stack = data.error_uri;
				throw error;
			}

			if (!data.access_token) {
				throw new Error('response did not contain a token');
			}

			return data.access_token;
		} catch (err) {
			this.logger.error(err, 'failed to get GitHub auth token from OAuth callback');
			throw err;
		}
	}
}

import {Module} from '@nestjs/common';

import {AxiosHttpService} from '../http/http.service';
import {GitHubAuth} from './github.auth';
import {GitHubServiceFactory} from './github.service.factory';
import {SharedModule} from '../shared.module';

const oauthService = {provide: 'OAuthService', useClass: GitHubAuth};

@Module({
	imports: [SharedModule],
	providers: [
		AxiosHttpService,
		oauthService,
		GitHubServiceFactory,
	],
	exports: [oauthService, GitHubServiceFactory],
})
export class GitHubModule {}

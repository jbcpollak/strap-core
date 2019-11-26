import {Module} from '@nestjs/common';

import {AppController} from './app.controller';
import {ArtifactoryModule} from './artifactory/artifactory.module';
import {GitHubModule} from './github/github.module';
import {StrapShModule} from './strap.sh/strap.sh.module';
import {SharedModule} from './shared.module';

@Module({
	imports: [ArtifactoryModule, GitHubModule, SharedModule, StrapShModule],
	controllers: [AppController],
})
export class AppModule {}

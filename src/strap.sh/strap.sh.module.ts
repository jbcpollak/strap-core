import {Module} from '@nestjs/common';

import {GitHubModule} from '../github/github.module';
import {SharedModule} from '../shared.module';
import {StrapShController} from './strap.sh.controller';
import {StrapShService} from './strap.sh.service';

@Module({
	imports: [GitHubModule, SharedModule],
	controllers: [StrapShController],
	providers: [StrapShService],
})
export class StrapShModule {}

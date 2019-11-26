import {Module} from '@nestjs/common';

import {ArtifactorySource} from './artifactory-source';
import {ArtifactoryService} from './artifactory.service';
import {AxiosHttpService} from '../http/http.service';
import {SharedModule} from '../shared.module';

@Module({
	imports: [SharedModule],
	providers: [ArtifactorySource, ArtifactoryService, AxiosHttpService],
	exports: [ArtifactoryService],
})
export class ArtifactoryModule { }

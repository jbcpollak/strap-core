import {Module} from '@nestjs/common';

import {ConfigService} from './config.service';
import {LoggerModule} from '../logger/logger.module';

@Module({
	imports: [LoggerModule],
	providers: [ConfigService],
	exports: [ConfigService],
})
export class ConfigModule { }

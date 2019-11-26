import {NestFactory} from '@nestjs/core';
import {NestExpressApplication} from '@nestjs/platform-express';
import {randomBytes} from 'crypto';
import * as session from 'express-session';

import {AppModule} from './app.module';

// No typings available
const memoryStore = require('memorystore');
const MemoryStore = memoryStore(session);

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	app.setBaseViewsDir(__dirname + '/views');
	app.setViewEngine('ejs');

	// Remove unnecessary header
	app.set('x-powered-by', false);

	// Set up sessions
	const secret = process.env.SESSION_SECRET || randomBytes(48).toString('hex');
	const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
	const store = new MemoryStore({checkPeriod: twentyFourHoursInMs});
	app.use(session({
		secret,
		store,
		resave: false,
		saveUninitialized: false,
	}));

	await app.listen(process.env.PORT || 5000);
}
bootstrap();

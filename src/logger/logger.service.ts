import * as pino from 'pino';

export class PinoLoggerService {
	logger = pino({
		level: process.env.LOG_LEVEL || 'info',
	});

	/**
	 * Create a child logger
	 * @param component Name of the component to create a child logger for
	 */
	child(component: string): pino.Logger {
		return this.logger.child({component});
	}
}

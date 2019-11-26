import {Injectable} from '@nestjs/common';

import {readFileSync} from 'fs';
import {join} from 'path';

@Injectable()
export class StrapShService {
	/**
	 * Load the script from disk
	 */
	loadScript(): string {
		const path = join(__dirname, '../../bin/strap.sh');
		return this.removeShebang(readFileSync(path, {encoding: 'UTF-8'}));
	}

	/**
	 * Remove the shebang from a script
	 */
	removeShebang(script: string): string {
		const shebang = /#!\/bin\/.+\n\n?/;
		return script.replace(shebang, '');
	}
}

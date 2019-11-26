import {StrapShService} from './strap.sh.service';

describe('StrapShController', () => {
	let strapShService: StrapShService;

	beforeEach(() => {
		strapShService = new StrapShService();
	});

	describe('loadScript', () => {
		it('should load the script as a string', () => {
			const result = strapShService.loadScript();
			expect(typeof result).toBe('string');
		});
		it('should remove the shebang from the script', () => {
			const result = strapShService.loadScript();
			expect(result.match(/#!\/bin\/.+/)).toBe(null);
		});
	});

	describe('removeShebang', () => {
		it('should remove a Bash shebang', () => {
			const script = `#!/bin/bash
echo 'foo';
exit 0;`;
			const result = `echo 'foo';
exit 0;`;
			expect(strapShService.removeShebang(script)).toBe(result);
		});
		it('should remove a Zsh shebang', () => {
			const script = `#!/bin/zsh
echo 'foo';
exit 0;`;
			const result = `echo 'foo';
exit 0;`;
			expect(strapShService.removeShebang(script)).toBe(result);
		});
		it('should remove a shebang and the newline after it', () => {
			const script = `#!/bin/sh

echo 'foo';
exit 0;`;
			const result = `echo 'foo';
exit 0;`;
			expect(strapShService.removeShebang(script)).toBe(result);
		});
	});
});

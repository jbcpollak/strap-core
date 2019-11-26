import {Chance} from 'chance';

import {getAll} from './get-all';

const chance = new Chance();

describe('getAll', () => {
	it('should work with an array of strings', async () => {
		const ids = [0, 1, 2, 3];
		const data = chance.n(chance.string, ids.length);
		const getter = async (id: number) => Promise.resolve(data[id]);
		const result = await getAll<number, string>(ids, getter);
		expect(result).toEqual(data);
	});
	it('should work with an object', async () => {
		const props = ['foo', 'bar'];
		const data: {[prop: string]: number} = {
			foo: chance.integer(),
			bar: chance.integer(),
		};
		const getter = async (prop: string) => Promise.resolve(data[prop]);
		const result = await getAll<string, number>(props, getter);
		expect(result).toEqual(Object.values(data));
	});
	it('should work when getter returns a non-Promise value', async () => {
		const ids = [0, 1];
		const data = chance.n(chance.string, ids.length);
		const getter = async (id: number) => data[id];
		const result = await getAll<number, string>(ids, getter);
		expect(result).toEqual(data);
	});
});

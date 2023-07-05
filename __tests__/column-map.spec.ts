import * as _module from "../src/bi-directional-sync";

describe('Column map', () => {

	it('should correctly map leftColumns to rightColumns', () => {
		const leftColumnsMapToRightColumn = { unique1: 'unique1R', unique2: 'unique2R' };

		expect(_module.getRightTableColumnEquivalence('unique1', leftColumnsMapToRightColumn)).toEqual('unique1R');
		expect(_module.getRightTableColumnEquivalence('unique3', leftColumnsMapToRightColumn)).toEqual('unique3');
	});
});

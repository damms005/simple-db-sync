import { BiDirectionalSync, getRightTableColumnEquivalence } from "../src/bi-directional-sync";
import { BaseSyncPayload, Row, SyncResult } from "../types";
import { DateTime } from "luxon";

describe('Bi-directional sync', () => {

	it('should correctly map leftColumns to rightColumns', () => {
		const leftColumnsMapToRightColumn = { unique1: 'unique1R', unique2: 'unique2R' };

		expect(getRightTableColumnEquivalence('unique1', leftColumnsMapToRightColumn)).toEqual('unique1R');
		expect(getRightTableColumnEquivalence('unique3', leftColumnsMapToRightColumn)).toEqual('unique3');
	});

	it('should add missing left table rows to the right table', () => {
		const leftTable = { selectRows: jest.fn() };
		const rightTable = { selectRows: jest.fn() };
		const leftRow: Row = { id: 1, name: 'tolumi', createdAt: new Date(), updatedAt: new Date() };

		const testParams: BaseSyncPayload = {
			primaryKeyColumnLeftTable: 'id',
			createdAtColumnLeftTable: 'createdAt',
			updatedAtColumnLeftTable: 'updatedAt',
			deletedAtColumnLeftTable: 'deletedAt',
			otherColumnsInLeftTable: ['anotherColumn'],
		};

		leftTable.selectRows.mockReturnValue([leftRow]);
		rightTable.selectRows.mockReturnValue([]);

		const result: SyncResult = BiDirectionalSync({ leftTable, rightTable, ...testParams });

		expect(result.rowsToAddToRight).toEqual([leftRow]);
	});

	it('should add missing right table rows to the left table', () => {
		const leftTable = { selectRows: jest.fn() };
		const rightTable = { selectRows: jest.fn() };
		const rightRow: Row = { id: 1, name: 'tolumi', createdAt: new Date(), updatedAt: new Date() };

		const testParams: BaseSyncPayload = {
			primaryKeyColumnLeftTable: 'id',
			createdAtColumnLeftTable: 'createdAt',
			updatedAtColumnLeftTable: 'updatedAt',
			deletedAtColumnLeftTable: 'deletedAt',
			otherColumnsInLeftTable: ['anotherColumn'],
		};

		leftTable.selectRows.mockReturnValue([]);
		rightTable.selectRows.mockReturnValue([rightRow]);

		const result: SyncResult = BiDirectionalSync({ leftTable, rightTable, ...testParams });

		expect(result.rowsToAddToLeft).toEqual([rightRow]);
	});

	it('should delete rows from right table that are deleted in the left table', () => {
		const leftTable = { selectRows: jest.fn() };
		const rightTable = { selectRows: jest.fn() };

		const yesterday = DateTime.now().minus({ days: 1 }).toJSDate();
		const leftTableRow: Row = { id: 1, name: 'tolumi', createdAt: yesterday, updatedAt: yesterday, deletedAt: new Date() };
		const rightTableRow: Row = { id: 1, name: 'tolumi', createdAt: yesterday, updatedAt: yesterday };

		const testParams: BaseSyncPayload = {
			primaryKeyColumnLeftTable: 'id',
			createdAtColumnLeftTable: 'createdAt',
			updatedAtColumnLeftTable: 'updatedAt',
			deletedAtColumnLeftTable: 'deletedAt',
			otherColumnsInLeftTable: ['anotherColumn'],
		};

		leftTable.selectRows.mockReturnValue([leftTableRow]);
		rightTable.selectRows.mockReturnValue([rightTableRow]);

		const result: SyncResult = BiDirectionalSync({ leftTable, rightTable, ...testParams });

		expect(result.rowsToDeleteFromRight).toEqual([{ id: 1 }]);
	});

	it('should not delete rows from right table that are not deleted in the left table', () => {
		const leftTable = { selectRows: jest.fn() };
		const rightTable = { selectRows: jest.fn() };
		const row: Row = { id: 1, name: 'tolumi', createdAt: new Date(), updatedAt: new Date() };

		const testParams: BaseSyncPayload = {
			primaryKeyColumnLeftTable: 'id',
			createdAtColumnLeftTable: 'createdAt',
			updatedAtColumnLeftTable: 'updatedAt',
			deletedAtColumnLeftTable: 'deletedAt',
			otherColumnsInLeftTable: ['anotherColumn'],
		};

		leftTable.selectRows.mockReturnValue([]);
		rightTable.selectRows.mockReturnValue([row]);

		const result: SyncResult = BiDirectionalSync({ leftTable, rightTable, ...testParams });

		expect(result.rowsToDeleteFromRight).toEqual([]);
	});

	it('should delete rows from left table that are deleted in the right table', () => {
		const leftTable = { selectRows: jest.fn() };
		const rightTable = { selectRows: jest.fn() };
		const yesterday = DateTime.now().minus({ days: 1 }).toJSDate();
		const leftTableRow: Row = { id: 1, name: 'tolumi', createdAt: yesterday, updatedAt: yesterday };
		const rightTableRow: Row = { id: 1, name: 'tolumi', createdAt: yesterday, updatedAt: yesterday, deletedAt: new Date() };

		const testParams: BaseSyncPayload = {
			primaryKeyColumnLeftTable: 'id',
			createdAtColumnLeftTable: 'createdAt',
			updatedAtColumnLeftTable: 'updatedAt',
			deletedAtColumnLeftTable: 'deletedAt',
			otherColumnsInLeftTable: ['anotherColumn'],
		};

		leftTable.selectRows.mockReturnValue([leftTableRow]);
		rightTable.selectRows.mockReturnValue([rightTableRow]);

		const result: SyncResult = BiDirectionalSync({ leftTable, rightTable, ...testParams });

		expect(result.rowsToDeleteFromLeft).toEqual([ { id: 1 } ]);
	});

	it('should update rows in right table that are updated in the left table', () => {
		const leftTable = { selectRows: jest.fn() };
		const rightTable = { selectRows: jest.fn() };
		const row: Row = { name: 'tolumi', updatedAt: new Date(2023, 5, 30) };
		const oldRow: Row = { ...row, updatedAt: new Date(2023, 5, 20) };

		const testParams: BaseSyncPayload = {
			primaryKeyColumnLeftTable: 'id',
			createdAtColumnLeftTable: 'createdAt',
			updatedAtColumnLeftTable: 'updatedAt',
			deletedAtColumnLeftTable: 'deletedAt',
			otherColumnsInLeftTable: ['anotherColumn'],
		};

		leftTable.selectRows.mockReturnValue([row]);
		rightTable.selectRows.mockReturnValue([oldRow]);

		const result: SyncResult = BiDirectionalSync({ leftTable, rightTable, ...testParams });

		expect(result.rowsToUpdateOnRight).toEqual([row]);
	});

	it('should update rows in left table that are updated in the right table', () => {
		const leftTable = { selectRows: jest.fn() };
		const rightTable = { selectRows: jest.fn() };
		const row: Row = { name: 'tolumi', updatedAt: new Date(2023, 6, 1) };
		const oldRow: Row = { ...row, updatedAt: new Date(2023, 5, 30) };

		const testParams: BaseSyncPayload = {
			primaryKeyColumnLeftTable: 'id',
			createdAtColumnLeftTable: 'createdAt',
			updatedAtColumnLeftTable: 'updatedAt',
			deletedAtColumnLeftTable: 'deletedAt',
			otherColumnsInLeftTable: ['anotherColumn'],
		};

		leftTable.selectRows.mockReturnValue([oldRow]);
		rightTable.selectRows.mockReturnValue([row]);

		const result: SyncResult = BiDirectionalSync({ leftTable, rightTable, ...testParams });

		expect(result.rowsToUpdateOnLeft).toEqual([row]);
	});
});

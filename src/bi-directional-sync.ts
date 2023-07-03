interface Row {
	column: string
	value: any
}

interface SyncResult {
	rowsToAddToRight: Row[]
	rowsToDeleteFromRight: Row[]
	rowsToDeleteFromLeft: Row[]
	rowsToUpdateOnRight: Row[]
	rowsToUpdateOnLeft: Row[]
	rowsToAddToLeft: Row[]
}

export function BiDirectionalSync(
	leftTable: any,
	rightTable: any,
	primaryKeyColumnLeftTable: string,
	lastCreatedAtColumnLeftTable: string,
	lastUpdatedAtColumnLeftTable: string,
	lastDeletedAtColumnLeftTable: string,
	columnsToUniquelySelectRowsLeftTable: string[],
	leftTableWhereClause: Record<string, any>,
	leftColumnsMapToRightColumn: Record<string, string>,
): SyncResult {
	const columnsToSelectFromLeftTable = [
		primaryKeyColumnLeftTable,
		...columnsToUniquelySelectRowsLeftTable,
		lastCreatedAtColumnLeftTable,
		lastUpdatedAtColumnLeftTable,
		lastDeletedAtColumnLeftTable,
	]

	const columnsToSelectFromRightTable = [
		getRightTableColumnEquivalence(primaryKeyColumnLeftTable, leftColumnsMapToRightColumn),
		...columnsToUniquelySelectRowsLeftTable.map(column => getRightTableColumnEquivalence(column, leftColumnsMapToRightColumn)),
		getRightTableColumnEquivalence(lastCreatedAtColumnLeftTable, leftColumnsMapToRightColumn),
		getRightTableColumnEquivalence(lastUpdatedAtColumnLeftTable, leftColumnsMapToRightColumn),
		getRightTableColumnEquivalence(lastDeletedAtColumnLeftTable, leftColumnsMapToRightColumn),
	]

	const rightTableWhereClause: Record<string, string> = Object.keys(leftTableWhereClause).reduce((accumulator, key) => {
		accumulator[getRightTableColumnEquivalence(key, leftColumnsMapToRightColumn)] = leftTableWhereClause[key]
		return accumulator
	}
		, {})

	const leftTableRows: Row[] = leftTable.selectRows(columnsToSelectFromLeftTable, leftTableWhereClause)
	const rightTableRows: Row[] = rightTable.selectRows(columnsToSelectFromRightTable, rightTableWhereClause)

	const rowsToAddToRight: Row[] = []
	const rowsToDeleteFromRight: Row[] = []
	const rowsToDeleteFromLeft: Row[] = []
	const rowsToUpdateOnRight: Row[] = []
	const rowsToUpdateOnLeft: Row[] = []
	const rowsToAddToLeft: Row[] = []

	leftTableRows.forEach(leftTableRow => {

		const rightTableRow = rightTableRows.find(rightTableRow => {
			return columnsToUniquelySelectRowsLeftTable.every(column => {
				return leftTableRow[column] === rightTableRow[getRightTableColumnEquivalence(column, leftColumnsMapToRightColumn)]
			})
		})

		if (!rightTableRow) {
			return rowsToAddToRight.push(leftTableRow)
		}

		// If the row was deleted on the left table, and the right table row is not deleted, and the
		// right table row was not updated after the left table row was deleted, delete the right table row.
		const leftTableRowWasDeleted = leftTableRow[lastDeletedAtColumnLeftTable]
		const rightTableRowWasNotDeleted = !rightTableRow[lastDeletedAtColumnLeftTable]
		const rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted = rightTableRow[lastUpdatedAtColumnLeftTable] < leftTableRow[lastDeletedAtColumnLeftTable]
		if (leftTableRowWasDeleted && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted) {
			return rowsToDeleteFromRight.push(rightTableRow)
		}

		// If the row was deleted on the right table, and the left table row is not deleted, and the
		// left table row was not updated after the right table row was deleted, delete the left table row.
		const rightTableRowWasDeleted = rightTableRow[lastDeletedAtColumnLeftTable]
		const leftTableRowWasNotDeleted = !leftTableRow[lastDeletedAtColumnLeftTable]
		const leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted = leftTableRow[lastUpdatedAtColumnLeftTable] < rightTableRow[lastDeletedAtColumnLeftTable]
		if (rightTableRowWasDeleted && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted) {
			return rowsToDeleteFromLeft.push(leftTableRow)
		}

		// If the row was updated on the left table, and the right table row is not deleted, and the
		// right table row was not updated after the left table row was updated, update the right table row.
		const leftTableRowWasUpdated = leftTableRow[lastUpdatedAtColumnLeftTable] > rightTableRow[lastUpdatedAtColumnLeftTable]
		const rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated = rightTableRow[lastUpdatedAtColumnLeftTable] < leftTableRow[lastUpdatedAtColumnLeftTable]
		if (leftTableRowWasUpdated && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated) {
			return rowsToUpdateOnRight.push(leftTableRow)
		}

		// If the row was updated on the right table, and the left table row is not deleted, and the
		// left table row was not updated after the right table row was updated, update the left table row.
		const rightTableRowWasUpdated = rightTableRow[lastUpdatedAtColumnLeftTable] > leftTableRow[lastUpdatedAtColumnLeftTable]
		const leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated = leftTableRow[lastUpdatedAtColumnLeftTable] < rightTableRow[lastUpdatedAtColumnLeftTable]
		if (rightTableRowWasUpdated && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated) {
			return rowsToUpdateOnLeft.push(rightTableRow)
		}


	})

	rightTableRows.forEach(rightTableRow => {
		const leftTableRow = leftTableRows.find(leftTableRow => {
			return columnsToUniquelySelectRowsLeftTable.every(column => {
				return leftTableRow[column] === rightTableRow[getRightTableColumnEquivalence(column, leftColumnsMapToRightColumn)]
			})
		})

		if (!leftTableRow) {
			return rowsToAddToLeft.push(rightTableRow)
		}
	})

	return {
		rowsToAddToRight,
		rowsToDeleteFromRight,
		rowsToDeleteFromLeft,
		rowsToUpdateOnRight,
		rowsToUpdateOnLeft,
		rowsToAddToLeft,
	}
}

/**
 * Gets the column equivalent in the right table from the map.
 * If there is no equivalent column in the map, returns same column name.
 */
function getRightTableColumnEquivalence(leftColumn: string, leftColumnsMapToRightColumn: Record<string, string>): string {
	return leftColumnsMapToRightColumn[leftColumn] || leftColumn
}
import { SyncResult, Row, SyncPayload } from "../types"

export function sync({
	leftTable,
	rightTable,
	primaryKeyColumnLeftTable,
	createdAtColumnLeftTable,
	updatedAtColumnLeftTable,
	deletedAtColumnLeftTable,
	otherColumnsInLeftTable,
	leftTableWhereClause,
	leftColumnsMapToRightColumn }: SyncPayload): SyncResult {
	const columnsToSelectFromLeftTable = [
		primaryKeyColumnLeftTable,
		...otherColumnsInLeftTable,
		createdAtColumnLeftTable,
		updatedAtColumnLeftTable,
		deletedAtColumnLeftTable,
	]

	const columnsToSelectFromRightTable = [
		getRightTableColumnEquivalence(primaryKeyColumnLeftTable, leftColumnsMapToRightColumn),
		...otherColumnsInLeftTable.map(column => getRightTableColumnEquivalence(column, leftColumnsMapToRightColumn)),
		getRightTableColumnEquivalence(createdAtColumnLeftTable, leftColumnsMapToRightColumn),
		getRightTableColumnEquivalence(updatedAtColumnLeftTable, leftColumnsMapToRightColumn),
		getRightTableColumnEquivalence(deletedAtColumnLeftTable, leftColumnsMapToRightColumn),
	]

	const rightTableWhereClause: Record<string, string> | undefined = leftTableWhereClause
		? Object.keys(leftTableWhereClause).reduce((accumulator, key) => {
			accumulator[getRightTableColumnEquivalence(key, leftColumnsMapToRightColumn)] = leftTableWhereClause[key]
			return accumulator
		}, {} as Record<string, string>)
		: undefined

	const leftTableRows: Row[] = leftTable.selectRows(columnsToSelectFromLeftTable, leftTableWhereClause)
	const rightTableRows: Row[] = rightTable.selectRows(columnsToSelectFromRightTable, rightTableWhereClause)

	const rowsToAddToRight: Row[] = []
	const rowsToDeleteFromRight: Row[] = []
	const rowsToDeleteFromLeft: Row[] = []
	const rowsToUpdateOnRight: Row[] = []
	const rowsToUpdateOnLeft: Row[] = []
	const rowsToAddToLeft: Row[] = []

	const columnsNotToUseForComparison = [
		primaryKeyColumnLeftTable,
		createdAtColumnLeftTable,
		updatedAtColumnLeftTable,
		deletedAtColumnLeftTable,
	]

	leftTableRows.forEach((leftTableRow: Row) => {

		const rightTableRow: Row | undefined = rightTableRows.find(rightTableRow => {
			return otherColumnsInLeftTable.every(column => {
				if (columnsNotToUseForComparison.includes(column)) {
					return true
				}

				const leftValue = leftTableRow[column]
				const rightValue = rightTableRow[getRightTableColumnEquivalence(column, leftColumnsMapToRightColumn)]
				return leftValue === rightValue
			})
		})

		if (!rightTableRow) {
			return rowsToAddToRight.push(leftTableRow)
		}

		// If the row was deleted on the left table, and the right table row is not deleted, and the
		// right table row was not updated after the left table row was deleted, delete the right table row.
		const leftTableRowWasDeleted = leftTableRow[deletedAtColumnLeftTable]
		const rightTableRowWasNotDeleted = !rightTableRow[deletedAtColumnLeftTable]
		const rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted = rightTableRow[updatedAtColumnLeftTable] < leftTableRow[deletedAtColumnLeftTable]
		if (leftTableRowWasDeleted && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted) {
			const primaryKeyColumnRightTable = getRightTableColumnEquivalence(primaryKeyColumnLeftTable, leftColumnsMapToRightColumn)
			const rowWithIdColumnOnly = { [primaryKeyColumnRightTable]: rightTableRow[primaryKeyColumnRightTable] }
			return rowsToDeleteFromRight.push(rowWithIdColumnOnly)
		}

		// If the row was deleted on the right table, and the left table row is not deleted, and the
		// left table row was not updated after the right table row was deleted, delete the left table row.
		const rightTableRowWasDeleted = rightTableRow[deletedAtColumnLeftTable]
		const leftTableRowWasNotDeleted = !leftTableRow[deletedAtColumnLeftTable]
		const leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted = leftTableRow[updatedAtColumnLeftTable] < rightTableRow[deletedAtColumnLeftTable]
		if (rightTableRowWasDeleted && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted) {
			const rowWithIdColumnOnly = { [primaryKeyColumnLeftTable]: leftTableRow[primaryKeyColumnLeftTable] }
			return rowsToDeleteFromLeft.push(rowWithIdColumnOnly)
		}

		// If the row was updated on the left table, and the right table row is not deleted, and the
		// right table row was not updated after the left table row was updated, update the right table row.
		const leftTableRowWasUpdated = leftTableRow[updatedAtColumnLeftTable] > rightTableRow[updatedAtColumnLeftTable]
		const rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated = rightTableRow[updatedAtColumnLeftTable] < leftTableRow[updatedAtColumnLeftTable]
		if (leftTableRowWasUpdated && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated) {
			return rowsToUpdateOnRight.push(leftTableRow)
		}

		// If the row was updated on the right table, and the left table row is not deleted, and the
		// left table row was not updated after the right table row was updated, update the left table row.
		const rightTableRowWasUpdated = rightTableRow[updatedAtColumnLeftTable] > leftTableRow[updatedAtColumnLeftTable]
		const leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated = leftTableRow[updatedAtColumnLeftTable] < rightTableRow[updatedAtColumnLeftTable]
		if (rightTableRowWasUpdated && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated) {
			return rowsToUpdateOnLeft.push(rightTableRow)
		}


	})

	rightTableRows.forEach(rightTableRow => {
		const leftTableRow = leftTableRows.find((leftTableRow: Row) => {
			return otherColumnsInLeftTable.every(column => {
				if (columnsNotToUseForComparison.includes(column)) {
					return true
				}

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
export function getRightTableColumnEquivalence(leftColumn: string, leftColumnsMapToRightColumn: Record<string, string> | undefined): string {

	if (!leftColumnsMapToRightColumn) {
		return leftColumn
	}

	return leftColumnsMapToRightColumn[leftColumn] || leftColumn
}
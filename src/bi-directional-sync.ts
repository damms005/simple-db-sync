import { SyncResult, Row, SyncPayload, LeftTable } from "../types"

export async function Sync({ leftTable, rightTable }: SyncPayload): Promise<SyncResult> {
  const columnsToSelectFromLeftTable = getLeftColumns(leftTable)
  const columnsToSelectFromRightTable = getRightColumns(leftTable)
  const rightTableWhereClause = getRightConstraintFromLeft(leftTable)
  const leftTableRows: Row[] = await leftTable.getRows(columnsToSelectFromLeftTable, leftTable.whereClause)
  const rightTableRows: Row[] = await rightTable.getRows(columnsToSelectFromRightTable, rightTableWhereClause)

  const result: SyncResult = {
    rowsToAddToRight: [],
    toDeleteFromRight: [],
    toDeleteFromLeft: [],
    rowsToUpdateOnRight: [],
    rowsToUpdateOnLeft: [],
    rowsToAddToLeft: [],
  } as SyncResult

  const columnsNotToUseForComparison = [leftTable.primaryKey, leftTable.createdAt, leftTable.updatedAt, leftTable.deletedAt]
  const primaryKeyColumnRightTable = getRightTableColumnEquivalence(leftTable.primaryKey, leftTable.mapToRightColumn)

  leftTableRows.forEach((leftTableRow: Row) => {
    const rightTableRow: Row | undefined = rightTableRows.find(rightTableRow => {
      return getRightRow(leftTable, columnsNotToUseForComparison, leftTableRow, rightTableRow)
    })

    if (!rightTableRow) {
      const leftRowWithoutIdColumn = { ...leftTableRow }
      delete leftRowWithoutIdColumn[leftTable.primaryKey]
      return result.rowsToAddToRight.push(leftRowWithoutIdColumn)
    }

    // If the row was deleted on the left table, and the right table row is not deleted, and the
    // right table row was not updated after the left table row was deleted, delete the right table row.
    const leftTableRowWasDeleted = leftTableRow[leftTable.deletedAt]
    const rightTableRowWasNotDeleted = !rightTableRow[leftTable.deletedAt]
    const rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted = rightTableRow[leftTable.updatedAt] < leftTableRow[leftTable.deletedAt]
    const shouldDeleteRightTableRow = leftTableRowWasDeleted && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted

    if (shouldDeleteRightTableRow) {
      const primaryKeyToDelete = rightTableRow[primaryKeyColumnRightTable]
      return result.toDeleteFromRight.push(primaryKeyToDelete)
    }

    // If the row was deleted on the right table, and the left table row is not deleted, and the
    // left table row was not updated after the right table row was deleted, delete the left table row.
    const rightTableRowWasDeleted = rightTableRow[leftTable.deletedAt]
    const leftTableRowWasNotDeleted = !leftTableRow[leftTable.deletedAt]
    const leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted = leftTableRow[leftTable.updatedAt] < rightTableRow[leftTable.deletedAt]
    const shouldDeleteLeftTableRow = rightTableRowWasDeleted && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted

    if (shouldDeleteLeftTableRow) {
      const primaryKeyToDelete = leftTableRow[leftTable.primaryKey]
      return result.toDeleteFromLeft.push(primaryKeyToDelete)
    }

    // If the row was updated on the left table, and the right table row is not deleted, and the
    // right table row was not updated after the left table row was updated, update the right table row.
    const leftTableRowWasUpdated = leftTableRow[leftTable.updatedAt] > rightTableRow[leftTable.updatedAt]
    const rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated = rightTableRow[leftTable.updatedAt] < leftTableRow[leftTable.updatedAt]
    const updateOnRight = leftTableRowWasUpdated && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated

    if (updateOnRight) {
      const leftTableRowWithoutIdColumn = { ...leftTableRow }
      delete leftTableRowWithoutIdColumn[leftTable.primaryKey]
      return result.rowsToUpdateOnRight.push(leftTableRowWithoutIdColumn)
    }

    // If the row was updated on the right table, and the left table row is not deleted, and the
    // left table row was not updated after the right table row was updated, update the left table row.
    const rightTableRowWasUpdated = rightTableRow[leftTable.updatedAt] > leftTableRow[leftTable.updatedAt]
    const leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated = leftTableRow[leftTable.updatedAt] < rightTableRow[leftTable.updatedAt]
    const updateOnLeft = rightTableRowWasUpdated && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated

    if (updateOnLeft) {
      const rightTableRowWithoutIdColumn = { ...rightTableRow }
      delete rightTableRowWithoutIdColumn[primaryKeyColumnRightTable]
      return result.rowsToUpdateOnLeft.push(rightTableRowWithoutIdColumn)
    }
  })

  rightTableRows.forEach(rightTableRow => {
    const leftTableRow = leftTableRows.find((leftTableRow: Row) => {
      return leftTable.otherColumns.every(column => {
        if (columnsNotToUseForComparison.includes(column)) {
          return true
        }

        return leftTableRow[column] === rightTableRow[getRightTableColumnEquivalence(column, leftTable.mapToRightColumn)]
      })
    })

    if (!leftTableRow) {
      const rightRowWithoutIdColumn = { ...rightTableRow }
      delete rightRowWithoutIdColumn[primaryKeyColumnRightTable]
      return result.rowsToAddToLeft.push(rightRowWithoutIdColumn)
    }
  })

  return result
}

function getRightRow(leftTable: LeftTable, columnsNotToUseForComparison: string[], leftTableRow: Row, rightTableRow: Row): unknown {
  return leftTable.otherColumns.every(column => {
    if (columnsNotToUseForComparison.includes(column)) {
      return true
    }

    const leftValue = leftTableRow[column]
    const rightValue = rightTableRow[getRightTableColumnEquivalence(column, leftTable.mapToRightColumn)]
    return leftValue === rightValue
  })
}

/**
 * Get the columns to select from the left table.
 */
function getLeftColumns(leftTable: LeftTable) {
  return [leftTable.primaryKey, ...leftTable.otherColumns, leftTable.createdAt, leftTable.updatedAt, leftTable.deletedAt]
}

/**
 * Get the columns to select from the right table as mapped from the left table.
 */
function getRightColumns(leftTable: LeftTable) {
  return [
    getRightTableColumnEquivalence(leftTable.primaryKey, leftTable.mapToRightColumn),
    ...leftTable.otherColumns.map(column => getRightTableColumnEquivalence(column, leftTable.mapToRightColumn)),
    getRightTableColumnEquivalence(leftTable.createdAt, leftTable.mapToRightColumn),
    getRightTableColumnEquivalence(leftTable.updatedAt, leftTable.mapToRightColumn),
    getRightTableColumnEquivalence(leftTable.deletedAt, leftTable.mapToRightColumn),
  ]
}

/**
 * Get the where clause for the right table from the left table.
 */
function getRightConstraintFromLeft(leftTable: LeftTable) {
  const leftTableWhereClause = leftTable.whereClause

  const rightTableWhereClause: Record<string, string> | undefined = leftTableWhereClause
    ? Object.keys(leftTableWhereClause).reduce(
        (accumulator, key) => {
          accumulator[getRightTableColumnEquivalence(key, leftTable.mapToRightColumn)] = leftTableWhereClause[key]
          return accumulator
        },
        {} as Record<string, string>,
      )
    : undefined
  return rightTableWhereClause
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

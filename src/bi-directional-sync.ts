import { Sequelize } from "sequelize"
import { SyncResult, Row, SyncPayload, LeftTable, RightTable } from "../types"
import { updateLastSyncTime } from "./logger"

export function Sync({ leftTable, rightTable }: SyncPayload): SyncResult {
  const result: SyncResult = {
    rowsToAddToRight: [],
    toDeleteFromRight: [],
    toDeleteFromLeft: [],
    rowsToUpdateOnRight: [],
    rowsToUpdateOnLeft: [],
    rowsToAddToLeft: [],

    updateSyncTimes: async (sequelize: Sequelize) => {
      await updateLastSyncTime(sequelize, leftTable)
      await updateLastSyncTime(sequelize, rightTable)
    },
  } as SyncResult

  const primaryKeyColumnRightTable = getRightColumnNameFromLeft(leftTable.primaryKey, leftTable.mapToRightColumn)
  const rightTableDeletedAtColumn = getRightColumnNameFromLeft(leftTable.deletedAt, leftTable.mapToRightColumn)
  const rightTableUpdatedAtColumn = getRightColumnNameFromLeft(leftTable.updatedAt, leftTable.mapToRightColumn)

  leftTable.rows.forEach((leftTableRow: Row) => {
    const matchedRightTableRow: Row | undefined = getCorrespondingRowFromRightTable(rightTable, leftTable, leftTableRow)

    if (!matchedRightTableRow) {
      const { [leftTable.primaryKey]: id, ...leftWithoutPrimaryKey } = leftTableRow
      const mappedRightTableRow = getRightRowMappedFromLeftRow(leftWithoutPrimaryKey, leftTable)
      return result.rowsToAddToRight.push(mappedRightTableRow)
    }

    // If the row was deleted on the left table, and the right table row is not deleted, and the
    // right table row was not updated after the left table row was deleted, delete the right table row.
    const leftTableRowWasDeleted = leftTableRow[leftTable.deletedAt]
    const rightTableRowWasNotDeleted = !matchedRightTableRow[rightTableDeletedAtColumn]
    const rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted = matchedRightTableRow[rightTableUpdatedAtColumn] < leftTableRow[leftTable.deletedAt]
    const shouldDeleteRightTableRow = leftTableRowWasDeleted && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted

    if (shouldDeleteRightTableRow) {
      const primaryKeyToDelete = matchedRightTableRow[primaryKeyColumnRightTable]
      return result.toDeleteFromRight.push(primaryKeyToDelete)
    }

    // If the row was deleted on the right table, and the left table row is not deleted, and the
    // left table row was not updated after the right table row was deleted, delete the left table row.
    const rightTableRowWasDeleted = matchedRightTableRow[rightTableDeletedAtColumn]
    const leftTableRowWasNotDeleted = !leftTableRow[leftTable.deletedAt]
    const leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted = leftTableRow[leftTable.updatedAt] < matchedRightTableRow[rightTableDeletedAtColumn]
    const shouldDeleteLeftTableRow = rightTableRowWasDeleted && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted

    if (shouldDeleteLeftTableRow) {
      const primaryKeyToDelete = leftTableRow[leftTable.primaryKey]
      return result.toDeleteFromLeft.push(primaryKeyToDelete)
    }

    // If the row was updated on the left table, and the right table row is not deleted, and the
    // right table row was not updated after the left table row was updated, update the right table row.
    const leftTableRowWasUpdated = leftTableRow[leftTable.updatedAt] > matchedRightTableRow[rightTableUpdatedAtColumn]
    const rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated = matchedRightTableRow[rightTableUpdatedAtColumn] < leftTableRow[leftTable.updatedAt]
    const updateOnRight = leftTableRowWasUpdated && rightTableRowWasNotDeleted && rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated

    if (updateOnRight) {
      const { [leftTable.primaryKey]: id, ...leftWithoutPrimaryKey } = leftTableRow
      const mappedRightTableRow = getRightRowMappedFromLeftRow(leftWithoutPrimaryKey, leftTable)
      return result.rowsToUpdateOnRight.push(mappedRightTableRow)
    }

    // If the row was updated on the right table, and the left table row is not deleted, and the
    // left table row was not updated after the right table row was updated, update the left table row.
    const rightTableRowWasUpdated = matchedRightTableRow[rightTableUpdatedAtColumn] > leftTableRow[leftTable.updatedAt]
    const leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated = leftTableRow[leftTable.updatedAt] < matchedRightTableRow[rightTableUpdatedAtColumn]
    const updateOnLeft = rightTableRowWasUpdated && leftTableRowWasNotDeleted && leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated

    if (updateOnLeft) {
      const { [primaryKeyColumnRightTable]: id, ...rightRowWithoutIdColumn } = matchedRightTableRow
      const mappedRow = getLeftRowMappedFromRightRow(rightRowWithoutIdColumn, leftTable)
      return result.rowsToUpdateOnLeft.push(mappedRow)
    }
  })

  rightTable.rows.forEach(rightTableRow => {
    const leftTableRow = leftTable.rows.find((leftTableRow: Row) => {
      return leftMatchesRight(leftTable, leftTableRow, rightTableRow)
    })

    if (!leftTableRow) {
      const { [primaryKeyColumnRightTable]: id, ...rowWithoutIdColumn } = rightTableRow
      const mappedRow = getLeftRowMappedFromRightRow(rowWithoutIdColumn, leftTable)
      return result.rowsToAddToLeft.push(mappedRow)
    }
  })

  return result
}

function getCorrespondingRowFromRightTable(rightTable: RightTable, leftTable: LeftTable, leftTableRow: Row): Row | undefined {
  return rightTable.rows.find(rightTableRow => {
    return rowAreSame(leftTableRow, rightTableRow, leftTable)
  })
}

function leftMatchesRight(leftTable: LeftTable, leftTableRow: Row, rightTableRow: Row): boolean {
  return leftTable.comparisonColumns.every(column => {
    const rightValue = rightTableRow[getRightColumnNameFromLeft(column, leftTable.mapToRightColumn)]
    const leftValue = leftTableRow[column]
    return leftValue === rightValue
  })
}

/**
 * Checks if the left and right rows are the same, based on the comparison map columns.
 */
function rowAreSame(leftTableRow: Row, rightTableRow: Row, leftTable: LeftTable): boolean {
  return leftTable.comparisonColumns.every(column => {
    const leftValue = leftTableRow[column]
    const rightValue = rightTableRow[getRightColumnNameFromLeft(column, leftTable.mapToRightColumn)]
    return leftValue === rightValue
  })
}

/**
 * Given the left column name, get the equivalent right column name from the map.
 * If there is no equivalent column in the map, returns same column name.
 */
export function getRightColumnNameFromLeft(leftColumn: string, leftColumnsMapToRightColumn: Record<string, string> | undefined): string {
  if (!leftColumnsMapToRightColumn) {
    return leftColumn
  }

  return leftColumnsMapToRightColumn[leftColumn] || leftColumn
}

/**
 * Returns the left table row with the column names mapped to the right table column names.
 */
function getLeftRowMappedFromRightRow(rightRow: Row, leftTable: LeftTable) {
  const mappedLeftTableRow: Row = {}

  Object.entries(rightRow).forEach(([columnName, value]) => {
    const leftColumn = getLeftColumnNameFromRight(columnName, leftTable)
    mappedLeftTableRow[leftColumn] = value
  })

  return mappedLeftTableRow
}

function getRightRowMappedFromLeftRow(leftRow: Row, leftTable: LeftTable) {
  const mappedRightTableRow: Row = {}

  Object.entries(leftRow).forEach(([columnName, value]) => {
    const rightColumn = getRightColumnNameFromLeft(columnName, leftTable.mapToRightColumn)
    mappedRightTableRow[rightColumn] = value
  })

  return mappedRightTableRow
}

/**
 * Given the right column name, get the equivalent left column name from the map.
 * If there is no equivalent column in the map, returns same column name.
 */
export function getLeftColumnNameFromRight(rightColumn: string, leftTable: LeftTable): string {
  if (!leftTable.mapToRightColumn) {
    return rightColumn
  }

  for (const [leftColumn, rightColumnEquivalent] of Object.entries(leftTable.mapToRightColumn)) {
    if (rightColumnEquivalent === rightColumn) {
      return leftColumn
    }
  }

  return rightColumn
}

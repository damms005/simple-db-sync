import { Sequelize } from "sequelize"
import { SyncResult, Row, SyncPayload, LeftTable, RightTable, DenormalisationDetail, Cell, RowWithoutPrimaryKey, DenormalisationMap } from "./types"
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
    const leftNonPrimaryKeyCells: Cell[] = leftTableRow.filter((cell: Cell) => cell.column !== leftTable.primaryKey)

    if (!matchedRightTableRow) {
      const mappedRightTableRow = getRightRowMappedFromLeftRow(leftNonPrimaryKeyCells, leftTable, rightTable)
      return result.rowsToAddToRight.push(mappedRightTableRow)
    }

    // If the row was deleted on the left table, and the right table row is not deleted, and the
    // right table row was not updated after the left table row was deleted, delete the right table row.
    const leftTableRowDeletedAt = leftTableRow.find(cell => cell.column === leftTable.deletedAt)?.value
    const leftTableRowWasDeleted = Boolean(leftTableRowDeletedAt)
    const rightTableRowDeletedAt = matchedRightTableRow.find(cell => cell.column === rightTableDeletedAtColumn)?.value
    const leftTableLastUpdate = leftTableRow.find(cell => cell.column === leftTable.updatedAt)?.value
    const rightTableLastUpdate = matchedRightTableRow.find(cell => cell.column === rightTableUpdatedAtColumn)?.value

    if (!rightTableLastUpdate) {
      throw new Error('Last update timestamp for right table not found')
    }

    const rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted = rightTableLastUpdate < (leftTableRowDeletedAt as string)
    const shouldDeleteRightTableRow = leftTableRowWasDeleted && !rightTableRowDeletedAt && rightTableRowWasNotUpdatedAfterLeftTableRowWasDeleted

    if (shouldDeleteRightTableRow) {
      const primaryKeyToDelete = matchedRightTableRow.find(cell => cell.column === primaryKeyColumnRightTable)

      if (!primaryKeyToDelete) {
        throw new Error('Primary key column was found on the left table but not defined on the right table');
      }

      if (!primaryKeyToDelete.value) {
        throw new Error('Primary key column was found but does not have a value');
      }

      return result.toDeleteFromRight.push(primaryKeyToDelete?.value as string | number)
    }

    // If the row was deleted on the right table, and the left table row is not deleted, and the
    // left table row was not updated after the right table row was deleted, delete the left table row.
    const rightTableRowWasDeleted = Boolean(rightTableRowDeletedAt)
    const leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted = !leftTableLastUpdate || leftTableLastUpdate < (rightTableRowDeletedAt as string)
    const shouldDeleteLeftTableRow = rightTableRowWasDeleted && !leftTableRowDeletedAt && leftTableRowWasNotUpdatedAfterRightTableRowWasDeleted

    if (shouldDeleteLeftTableRow) {
      const primaryKeyToDelete = leftTableRow.find(cell => cell.column === leftTable.primaryKey)

      if (!primaryKeyToDelete) {
        throw new Error('The primary key column was not found on the left table')
      }

      if (!primaryKeyToDelete.value) {
        throw new Error('Primary key column was found but does not have a value');
      }

      return result.toDeleteFromLeft.push(primaryKeyToDelete.value)
    }

    // If the row was updated on the left table, and the right table row is not deleted, and the
    // right table row was not updated after the left table row was updated, update the right table row.
    const leftTableRowWasUpdated = leftTableLastUpdate && leftTableLastUpdate > rightTableLastUpdate
    const rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated = !leftTableLastUpdate || rightTableLastUpdate < leftTableLastUpdate
    const updateOnRight = leftTableRowWasUpdated && !rightTableRowDeletedAt && rightTableRowWasNotUpdatedAfterLeftTableRowWasUpdated

    if (updateOnRight) {
      const mappedRightTableRow = getRightRowMappedFromLeftRow(leftNonPrimaryKeyCells, leftTable, rightTable)
      return result.rowsToUpdateOnRight.push(mappedRightTableRow)
    }

    // If the row was updated on the right table, and the left table row is not deleted, and the
    // left table row was not updated after the right table row was updated, update the left table row.
    const rightTableRowWasUpdated = (rightTableLastUpdate && leftTableLastUpdate) && rightTableLastUpdate > leftTableLastUpdate
    const leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated = leftTableLastUpdate && (leftTableLastUpdate < rightTableLastUpdate)
    const updateOnLeft = rightTableRowWasUpdated && !leftTableRowDeletedAt && leftTableRowWasNotUpdatedAfterRightTableRowWasUpdated

    if (updateOnLeft) {
      const rightNonPrimaryKeyCells: Cell[] = matchedRightTableRow.filter((cell: Cell) => cell.column !== primaryKeyColumnRightTable)
      const mappedRow = getLeftRowMappedFromRightRow(rightNonPrimaryKeyCells, leftTable, rightTable)
      return result.rowsToUpdateOnLeft.push(mappedRow)
    }
  })

  rightTable.rows.forEach(rightTableRow => {
    const leftTableRow = leftTable.rows.find((leftTableRow: Row) => {
      return leftMatchesRight(leftTable, leftTableRow, rightTableRow)
    })

    if (!leftTableRow) {
      const rightNonPrimaryKeyCells: Cell[] = rightTableRow.filter((cell: Cell) => cell.column !== primaryKeyColumnRightTable)
      const mappedRow = getLeftRowMappedFromRightRow(rightNonPrimaryKeyCells, leftTable, rightTable)
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
    const rightColumnName = getRightColumnNameFromLeft(column, leftTable.mapToRightColumn)
    const rightValue = rightTableRow.find(cell => cell.column === rightColumnName)?.value
    const leftValue = leftTableRow.find(cell => cell.column === column)?.value
    return leftValue === rightValue
  })
}

/**
 * Checks if the left and right rows are the same, based on the comparison map columns.
 */
function rowAreSame(leftTableRow: Row, rightTableRow: Row, leftTable: LeftTable): boolean {
  return leftTable.comparisonColumns.every(column => {
    const leftValue = leftTableRow.find(cell => cell.column === column)?.value
    const rightColumnName = getRightColumnNameFromLeft(column, leftTable.mapToRightColumn)
    const rightValue = rightTableRow.find(cell => cell.column === rightColumnName)?.value
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
function getLeftRowMappedFromRightRow(rightRowCells: Cell[], leftTable: LeftTable, rightTable: RightTable): RowWithoutPrimaryKey {
  const mappedLeftTableRow: RowWithoutPrimaryKey = {}
  for (const cell of rightRowCells) {
    const leftColumn = getLeftColumnNameFromRight(cell.column, leftTable)
    mappedLeftTableRow[leftColumn] = getRealValueForLeftRowFrom(cell, leftTable, rightTable)
  }

  return mappedLeftTableRow
}

function getRightRowMappedFromLeftRow(leftRowCells: Cell[], leftTable: LeftTable, rightTable: RightTable): RowWithoutPrimaryKey {
  const mappedRightTableRow: RowWithoutPrimaryKey = {}

  for (const cell of leftRowCells) {
    const rightColumn = getRightColumnNameFromLeft(cell.column, leftTable.mapToRightColumn)
    mappedRightTableRow[rightColumn] = getRealValueForRightRowFrom(cell, leftTable, rightTable)
  }

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

function getRealValueForRightRowFrom(leftCell: Cell, leftTable: LeftTable, rightTable: RightTable): any {
  const isForeignKeyColumn = leftTable.foreignKeyColumns?.includes(leftCell.column)

  if (!isForeignKeyColumn) {
    return leftCell.value
  }

  if (!rightTable.denormalisationDetails) {
    throw new Error('Right table does not provide denormalisation details')
  }

  const rightTableColumn = getRightColumnNameFromLeft(leftCell.column, leftTable.mapToRightColumn)
  const rightTableDenormalisationDetail: DenormalisationDetail | undefined = rightTable.denormalisationDetails.find(nonNormal => nonNormal.column === rightTableColumn)

  if (!rightTableDenormalisationDetail) {
    const message = `Left table has a foreign key column '${leftCell.column}' which in the right table is the '${rightTableColumn}' column, but the right table
    does not provide denormalisation details for '${rightTableColumn}'`;
    throw new Error(message)
  }

  const denormalisedValue: DenormalisationMap | undefined = rightTableDenormalisationDetail.denormalisationMap.find(nonNormal => nonNormal.denormalisedColumnValue === leftCell.denormalisedValue)

  if (!denormalisedValue) {
    const message = `Left table has a foreign key column '${leftCell.column}' which in the right table is the '${rightTableColumn}' column, but the right table
    does not provide denormalisation details for '${rightTableColumn}' with the value '${leftCell.denormalisedValue}'`;
    throw new Error(message)
  }

  return denormalisedValue.normalisedColumnValue
}

function getRealValueForLeftRowFrom(rightCell: Cell, leftTable: LeftTable, rightTable: RightTable): any {
  const isForeignKeyColumn = rightTable.foreignKeyColumns?.includes(rightCell.column)

  if (!isForeignKeyColumn) {
    return rightCell.value
  }

  if (!leftTable.denormalisationDetails) {
    throw new Error('Left table does not provide denormalisation details')
  }

  const leftTableColumn = getLeftColumnNameFromRight(rightCell.column, leftTable)
  const leftTableDenormalisationDetail: DenormalisationDetail | undefined = leftTable.denormalisationDetails.find(nonNormal => nonNormal.column === leftTableColumn)

  if (!leftTableDenormalisationDetail) {
    const message = `Right table has a foreign key column '${rightCell.column}' which in the left table is the '${leftTableColumn}' column, but the left table
    does not provide denormalisation details for '${leftTableColumn}'`;
    throw new Error(message)
  }

  const denormalisedValue: DenormalisationMap | undefined = leftTableDenormalisationDetail.denormalisationMap.find(nonNormal => nonNormal.denormalisedColumnValue === rightCell.denormalisedValue)

  if (!denormalisedValue) {
    const message = `Right table has a foreign key column '${rightCell.column}' which in the left table is the '${leftTableColumn}' column, but the left table
    does not provide denormalisation details for '${leftTableColumn}' with the value '${rightCell.denormalisedValue}'`;
    throw new Error(message)
  }

  return denormalisedValue.normalisedColumnValue
}

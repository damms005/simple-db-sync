/**
 * This is a key-value pair of column names and their corresponding values, including
 * the primary key column.
 */
export type Row = { [column: string]: any }

/**
 * This is a key-value pair of column names and their corresponding values, but
 * without the primary key column.
 */
export type RowWithoutPrimaryKey = { [column: string]: any }

export type PrimaryKey = any

type RightTable = {
  rows: Row[]
}

export interface SyncPayload extends BaseSyncPayload {
  leftTable: LeftTable
  rightTable: RightTable
}

export interface SyncResult {
  /**
   * Array of rows to add to right table. If needed, the column names are
   * already mapped based on the mapToRightColumn property in the left table.
   */
  rowsToAddToRight: RowWithoutPrimaryKey[]

  /**
   * Array of primary keys to delete from right table.
   */
  toDeleteFromRight: PrimaryKey[]

  /**
   * Array of primary keys to delete from left table.
   */
  toDeleteFromLeft: PrimaryKey[]

  rowsToUpdateOnRight: RowWithoutPrimaryKey[]
  rowsToUpdateOnLeft: RowWithoutPrimaryKey[]
  rowsToAddToLeft: RowWithoutPrimaryKey[]
}

export type LeftTable = {
  /**
   * The name of the primary key column in the left table.
   */
  primaryKey: string

  /**
   * The name of the column in the left table that stores the date the row was created.
   */
  createdAt: string

  /**
   * The name of the column in the left table that stores the date the row was last updated.
   */
  updatedAt: string

  /**
   * The name of the column in the left table that stores the date the row was deleted.
   */
  deletedAt: string

  /**
   * Columns to use for matching the corresponding rows in the right table.
   * The columns map will be used to get the corresponding column names in the right table.
   */
  comparisonColumns: string[]

  /**
   * A map of column names in the left table to column names in the right table. It is
   * only needed if the column names in the left table are different from the column names.
   * The keys are the column names in the left table, and the values are the column names
   * in the right table.
   *
   * You can simply include only the columns that are different.
   */
  mapToRightColumn?: Record<string, string>

  whereClause?: Record<string, any>
  rows: Row[]
}

import { Sequelize } from "sequelize"

export type Row = Cell[]

export type Cell = {
  column: string,
  value: CellValue
  /**
   * If this column is normalised and instead references value in another
   * table and only hold the id for the target parent row, then the real
   * denormalised value should be specified here
   */
  denormalisedValue?: string | number
}

type CellValue = CellValue

/**
 * This is a key-value pair of column names and their corresponding values, but
 * without the primary key column.
 */
export type RowWithoutPrimaryKey = { [column: string]: CellValue }

export type PrimaryKey = string | number

export interface SyncPayload {
  leftTable: LeftTable
  rightTable: RightTable
}

type Table = {
  name: string
  rows: Row[]
  /**
   * The columns that are foreign keys in this table
   */
  foreignKeyColumns?: string[]
  /**
 * The columns on this table that are references to values in another table
 * should be indicated here, together with their corresponding possible values
 */
  denormalisationDetails?: DenormalisationDetail[]
}

export interface LeftTable extends Table {
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
   * The keys are the column names in the left table, and the values are the corresponding column names
   * in the right table.
   *
   * You can simply include only the columns that are different.
   */
  mapToRightColumn?: Record<string, string>
}

export interface RightTable extends Table {
}

/**
 * Details on how a normalized column can de denormalised
 */
export type DenormalisationDetail = {
  column: string
  denormalisationMap: DenormalisationMap[]
}

export type DenormalisationMap = {
  /**
   * This is usually numeric, e.g. the 'id' value -- the value
   * that will be used for this column in a typical data normalisation
   */
  normalisedColumnValue: string | number
  /**
   * This is the value that will be used for this column in a typical data denormalisation
   */
  denormalisedColumnValue: string | number
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

  /**
   * Logs the result of the sync operation. Can be useful for
   * constructing the 'where' clause for the next sync operation.
   */
  updateSyncTimes(sequelize: Sequelize): Promise<void>
}

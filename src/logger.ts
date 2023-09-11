import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize"
import { LeftTable, RightTable } from "../types"

export const simple_db_sync_tracking = "simple_db_sync_tracking"

interface IAppData extends Model<InferAttributes<IAppData>, InferCreationAttributes<IAppData>> {
  table: string
  lastSyncTime: number
}

export async function updateLastSyncTime(sequelize: Sequelize, table: LeftTable | RightTable): Promise<void> {
  const TrackingTable = await getTrackingTable(sequelize)

  // Update the last sync time for the provided table
  await TrackingTable.upsert({
    table: table.name,
    lastSyncTime: Date.now(),
  })
}

/**
 * Returns a where clause that can be used to get all rows from the provided table that have been
 * created, updated, or deleted since the last sync time for the provided table.
 *
 * @param table The table to get the where clause for.
 * @param sequelize The Sequelize instance.
 * @param createdAt The name of the column in the table that stores the date the row was created.
 * @param updatedAt The name of the column in the table that stores the date the row was last updated.
 * @param deletedAt The name of the column in the table that stores the date the row was deleted.
 *
 * @returns string The where clause.
 */
export async function getSyncWhereClauseFor(
  table: string,
  sequelize: Sequelize,
  createdAt = "created_at",
  updatedAt = "updated_at",
  deletedAt = "deleted_at",
): Promise<string> {
  // Get the last sync time for the provided table from the tracking table
  const lastSyncTime = await getLastSyncTime(sequelize, table)

  // Build the SQL query string
  const sql = `(
    (${createdAt} IS NULL OR ${createdAt} >= ${lastSyncTime})
    OR (${updatedAt} IS NULL OR ${updatedAt} >= ${lastSyncTime})
    OR (${deletedAt} IS NULL OR ${deletedAt} >= ${lastSyncTime})
 ) `

  return sql
}

async function getLastSyncTime(sequelize: Sequelize, table: string): Promise<number | undefined> {
  const TrackingTable = await getTrackingTable(sequelize)

  const trackingRow = await TrackingTable.findOne({
    where: {
      table,
    },
  })

  if (!trackingRow) {
    return
  }

  return trackingRow.lastSyncTime
}

async function getTrackingTable(sequelize: Sequelize) {
  const TrackingTable = sequelize.define<IAppData>(simple_db_sync_tracking, {
    table: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    lastSyncTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  })

  await TrackingTable.sync()

  return TrackingTable
}

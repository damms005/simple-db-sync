export interface Row { [column: string]: any }

export interface SyncResult {
	rowsToAddToRight: Row[]
	rowsToDeleteFromRight: Row[]
	rowsToDeleteFromLeft: Row[]
	rowsToUpdateOnRight: Row[]
	rowsToUpdateOnLeft: Row[]
	rowsToAddToLeft: Row[]
}



export interface BaseSyncPayload {

	/**
	 * The name of the primary key column in the left table.
	 */
	primaryKeyColumnLeftTable: string,

	/**
	 * The name of the column in the left table that stores the date the row was created.
	 */
	createdAtColumnLeftTable: string,

	/**
	 * The name of the column in the left table that stores the date the row was last updated.
	 */
	updatedAtColumnLeftTable: string,

	/**
	 * The name of the column in the left table that stores the date the row was deleted.
	 */
	deletedAtColumnLeftTable: string,

	/**
	 * Other columns in the left table, apart from the already specified columns.
	 */
	otherColumnsInLeftTable: string[],

	leftTableWhereClause?: Record<string, any>,
	leftColumnsMapToRightColumn?: Record<string, string>,
}

export interface SyncPayload extends BaseSyncPayload {
	leftTable: { selectRows: (columns: string[], whereClause: Record<string, any> | undefined) => Row[] },
	rightTable: { selectRows: (columns: string[], whereClause: Record<string, any> | undefined) => Row[] },
}
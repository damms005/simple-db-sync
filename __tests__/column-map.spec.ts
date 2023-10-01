import * as _module from "../src/sync"
import { LeftTable, Row, RowWithoutPrimaryKey, SyncPayload, SyncResult } from "../src/types"

describe("Column map", () => {

  const now = (new Date()).toString()

  it("should correctly map leftColumns to rightColumns", () => {
    const leftColumnsMapToRightColumn = { unique1: "unique1R", unique2: "unique2R" }

    expect(_module.getRightColumnNameFromLeft("unique1", leftColumnsMapToRightColumn)).toEqual("unique1R")
    expect(_module.getRightColumnNameFromLeft("unique3", leftColumnsMapToRightColumn)).toEqual("unique3")
  })

  it("should correctly map rightColumns to leftColumns", () => {
    const leftColumnsMapToRightColumn = { unique1: "unique1R", unique2: "unique2R" }
    const leftTable: LeftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: [],
      mapToRightColumn: leftColumnsMapToRightColumn,
      rows: [],
      foreignKeyColumns: [],
    }

    expect(_module.getLeftColumnNameFromRight("unique1R", leftTable)).toEqual("unique1")
    expect(_module.getLeftColumnNameFromRight("unique3R", leftTable)).toEqual("unique3R")
  })

  it("should correctly map leftColumns to rightColumns", () => {
    const leftColumnsMapToRightColumn = { unique1: "unique1R", unique2: "unique2R" }

    expect(_module.getRightColumnNameFromLeft("unique1", leftColumnsMapToRightColumn)).toEqual("unique1R")
    expect(_module.getRightColumnNameFromLeft("unique3", leftColumnsMapToRightColumn)).toEqual("unique3")
  })

  it("should map left columns to right columns when adding missing left table rows to the right table", async () => {
    const leftRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "Tolumi" },
      { column: 'createdAt', value: new Date(now) },
      { column: 'updatedAt', value: new Date(now) }
    ]
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: [],
      mapToRightColumn: { name: "name_in_right_table" }, // Map left column "name" to right column "name_in_right_table"
      rows: [leftRow],
    }
    const rightTable = { name: "right", rows: [] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = _module.Sync(payload)

    const rightRow: RowWithoutPrimaryKey = {
      name_in_right_table: "Tolumi",
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    expect(result.rowsToAddToRight).toStrictEqual([rightRow])
  })

  it("should map right columns to left columns when adding missing right table rows to the left table", async () => {
    const rightRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name_in_right_table', value: "Tolumi" },
      { column: 'createdAt', value: new Date(now) },
      { column: 'updatedAt', value: new Date(now) }
    ]
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: [],
      mapToRightColumn: { name: "name_in_right_table" }, // Map left column "name" to right column "name_in_right_table"
      rows: [],
    }
    const rightTable = { name: "right", rows: [rightRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = _module.Sync(payload)

    const leftRow: RowWithoutPrimaryKey = {
      name: "Tolumi",
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    expect(result.rowsToAddToLeft).toStrictEqual([leftRow])
  })
})

import { Sync } from "../src/bi-directional-sync"
import { SyncPayload, Row, SyncResult, LeftTable } from "../types"
import { DateTime } from "luxon"

describe("Bi-directional sync", () => {
  it("should add missing left table rows to the right table", async () => {
    const leftRow: Row = { id: 1, name: "Tolumi", createdAt: new Date(), updatedAt: new Date() }
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["anotherColumn"],
      rows: [leftRow],
    }
    const rightTable = { name: "right", rows: [] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    const { id, ...rowWithoutId } = leftRow
    expect(result.rowsToAddToRight).toEqual([rowWithoutId])
  })

  it("should add missing right table rows to the left table", async () => {
    const rightRow: Row = { id: 1, name: "Tolumi", createdAt: new Date(), updatedAt: new Date() }
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["anotherColumn"],
      rows: [],
    }
    const rightTable = { name: "right", rows: [rightRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    const { id, ...rowWithoutId } = rightRow
    expect(result.rowsToAddToLeft).toEqual([rowWithoutId])
  })

  it("should delete rows from right table that are deleted in the left table", async () => {
    const yesterday = DateTime.now().minus({ days: 1 }).toJSDate()
    const leftTableRow: Row = { id: 1, name: "Tolumi", createdAt: yesterday, updatedAt: yesterday, deletedAt: new Date() }
    const rightRow: Row = { id: 5, name: "Tolumi", createdAt: yesterday, updatedAt: yesterday }

    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["anotherColumn"],
      rows: [leftTableRow],
    }
    const rightTable = { name: "right", rows: [rightRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    expect(result.toDeleteFromRight).toEqual([5])
  })

  it("should not delete rows from right table that are not deleted in the left table", async () => {
    const row: Row = { id: 1, name: "Tolumi", createdAt: new Date(), updatedAt: new Date() }
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["anotherColumn"],
      rows: [],
    }
    const rightTable = { name: "right", rows: [row] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    expect(result.toDeleteFromRight).toEqual([])
  })

  it("should delete rows from left table that are deleted in the right table", async () => {
    const yesterday = DateTime.now().minus({ days: 1 }).toJSDate()
    const leftTableRow: Row = { id: 6, name: "Tolumi", createdAt: yesterday, updatedAt: yesterday }
    const rightTableRow: Row = { id: 1, name: "Tolumi", createdAt: yesterday, updatedAt: yesterday, deletedAt: new Date() }
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["anotherColumn"],
      rows: [leftTableRow],
    }
    const rightTable = { name: "right", rows: [rightTableRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    expect(result.toDeleteFromLeft).toEqual([6])
  })

  it("should update rows in right table that are updated in the left table", async () => {
    const luxonNow = DateTime.now()
    const luxonNowMinusOneDay = luxonNow.minus({ days: 1 })
    const oldRow: Row = { name: "Tolumi", playful: "no", updatedAt: luxonNowMinusOneDay.toString() }
    const newRow: Row = { ...oldRow, playful: "yes", updatedAt: luxonNow.toString() }
    const leftTable: LeftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["anotherColumn"],
      rows: [newRow],
    }
    const rightTable = { name: "right", rows: [oldRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    expect(result.rowsToUpdateOnRight).toEqual([newRow])
  })

  it("should update rows in left table that are updated in the right table", async () => {
    const row: Row = { name: "Tolumi", updatedAt: new Date(2023, 6, 1) }
    const oldRow: Row = { ...row, updatedAt: new Date(2023, 5, 30) }
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["anotherColumn"],
      rows: [oldRow],
    }
    const rightTable = { name: "right", rows: [row] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    expect(result.rowsToUpdateOnLeft).toEqual([row])
  })

  it("can use map to get corresponding column names in the right table", async () => {
    const leftRow: Row = { id: 1, name: "Tolumi", createdAt: new Date(), updatedAt: new Date() }
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
      mapToRightColumn: { name: "name_in_right_table" },
      rows: [leftRow],
    }
    const rightTable = { name: "right", rows: [] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    const rightRow: Row = { name_in_right_table: "Tolumi", createdAt: new Date(), updatedAt: new Date() }

    expect(result.rowsToAddToRight).toEqual([rightRow])
  })
})

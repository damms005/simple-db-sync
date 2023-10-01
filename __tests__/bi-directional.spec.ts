import { Sync } from "../src/bi-directional-sync"
import { DateTime } from "luxon"
import { Row, SyncPayload, SyncResult, LeftTable } from "../src/types"

describe("Bi-directional sync", () => {
  it("should add missing left table rows to the right table", async () => {
    const now = new Date()
    const leftRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "Tolumi" },
      { column: 'createdAt', value: now },
      { column: 'updatedAt', value: now }
    ]
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
      rows: [leftRow],
    }
    const rightTable = { name: "right", rows: [] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    const rowWithoutId = { name: "Tolumi", createdAt: now, updatedAt: now }

    expect(result.rowsToAddToRight).toEqual([rowWithoutId])
  })

  it("should add missing right table rows to the left table", async () => {
    const now = new Date()
    const rightRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "Tolumi" },
      { column: 'createdAt', value: now },
      { column: 'updatedAt', value: now }
    ]
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
      rows: [],
    }
    const rightTable = { name: "right", rows: [rightRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    const rowWithoutId = { name: "Tolumi", createdAt: now, updatedAt: now }
    expect(result.rowsToAddToLeft).toEqual([rowWithoutId])
  })

  it("should delete rows from right table that are deleted in the left table", async () => {
    const yesterday = DateTime.now().minus({ days: 1 }).toJSDate()
    const now = new Date()
    const leftTableRow: Row = [
      { column: 'id', value: 1 }, { column: 'name', value: "Tolumi" }, { column: 'createdAt', value: yesterday }, { column: 'updatedAt', value: yesterday }, { column: 'deletedAt', value: now }
    ]
    const rightRow: Row = [
      { column: 'id', value: 5 }, { column: 'name', value: "Tolumi" }, { column: 'createdAt', value: yesterday }, { column: 'updatedAt', value: yesterday }
    ]

    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
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
    const now = new Date()
    const row: Row = [
      { column: 'id', value: 1 }, { column: 'name', value: "Tolumi" }, { column: 'createdAt', value: now }, { column: 'updatedAt', value: now }]
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
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
    const now = new Date()
    const leftTableRow: Row = [{ column: 'id', value: 6 }, { column: 'name', value: "Tolumi" }, { column: 'createdAt', value: yesterday }, { column: 'updatedAt', value: yesterday }]
    const rightTableRow: Row = [{ column: 'id', value: 1 }, { column: 'name', value: "Tolumi" }, { column: 'createdAt', value: yesterday }, { column: 'updatedAt', value: yesterday }, { column: 'deletedAt', value: now }]
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
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
    const now = DateTime.fromObject({ year: 1992, month: 5, day: 8 })
    const luxonNowMinusOneDay = DateTime.fromObject({ year: 1992, month: 5, day: 7 })
    const rightRow: Row = [
      { column: 'name', value: "Tolumi" },
      { column: 'playful', value: "no" },
      { column: 'updatedAt', value: luxonNowMinusOneDay.toString() }
    ]
    const leftRow: Row = [
      { column: 'name', value: "Tolumi" },
      { column: 'playful', value: "yes" },
      { column: 'updatedAt', value: now.toString() }
    ]
    const leftTable: LeftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
      rows: [leftRow],
    }
    const rightTable = { name: "right", rows: [rightRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    expect(result.rowsToUpdateOnRight).toEqual([{
      name: "Tolumi",
      playful: "yes",
      updatedAt: now.toString(),
    }])
  })

  it("should update rows in left table that are updated in the right table", async () => {
    const present = DateTime.fromObject({ year: 1992, month: 5, day: 8 })
    const past = DateTime.fromObject({ year: 1992, month: 5, day: 7 })
    const rightRow: Row = [{ column: 'name', value: "Tolumi" }, { column: 'updatedAt', value: present.toString() }]
    const leftRow: Row = [{ column: 'name', value: "Tolumi" }, { column: 'updatedAt', value: past.toString() }]
    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
      rows: [leftRow],
    }
    const rightTable = { name: "right", rows: [rightRow] }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    expect(result.rowsToUpdateOnLeft).toEqual([{
      name: "Tolumi",
      updatedAt: present.toString(),
    }])
  })

  it("can use map to get corresponding column names in the right table", async () => {
    const now = new Date()
    const leftRow: Row = [{ column: 'id', value: 1 }, { column: 'name', value: "Tolumi" }, { column: 'createdAt', value: now }, { column: 'updatedAt', value: now }]
    const leftTable: LeftTable = {
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

    expect(result.rowsToAddToRight).toEqual([{
      name_in_right_table: "Tolumi",
      createdAt: now, updatedAt: now
    }])
  })
})

import { Sync } from "../src/bi-directional-sync"
import { SyncPayload, Row, SyncResult } from "../types"
import { DateTime } from "luxon"

describe("Bi-directional sync", () => {
  it("should add missing left table rows to the right table", async () => {
    const leftTable = {
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      otherColumns: ["anotherColumn"],
      getRows: jest.fn(),
    }
    const rightTable = { getRows: jest.fn() }
    const leftRow: Row = { id: 1, name: "tolumi", createdAt: new Date(), updatedAt: new Date() }

    leftTable.getRows.mockReturnValue([leftRow])
    rightTable.getRows.mockReturnValue([])

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = await Sync(payload)

    expect(result.rowsToAddToRight).toEqual([delete leftRow.id && leftRow])
  })

  it("should add missing right table rows to the left table", async () => {
    const leftTable = {
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      otherColumns: ["anotherColumn"],
      getRows: jest.fn(),
    }
    const rightTable = { getRows: jest.fn() }
    const rightRow: Row = { id: 1, name: "tolumi", createdAt: new Date(), updatedAt: new Date() }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    leftTable.getRows.mockReturnValue([])
    rightTable.getRows.mockReturnValue([rightRow])

    const result: SyncResult = await Sync(payload)

    expect(result.rowsToAddToLeft).toEqual([delete rightRow.id && rightRow])
  })

  it("should delete rows from right table that are deleted in the left table", async () => {
    const leftTable = {
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      otherColumns: ["anotherColumn"],
      getRows: jest.fn(),
    }
    const rightTable = { getRows: jest.fn() }

    const yesterday = DateTime.now().minus({ days: 1 }).toJSDate()
    const leftTableRow: Row = { id: 1, name: "tolumi", createdAt: yesterday, updatedAt: yesterday, deletedAt: new Date() }
    const rightTableRow: Row = { id: 5, name: "tolumi", createdAt: yesterday, updatedAt: yesterday }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    leftTable.getRows.mockReturnValue([leftTableRow])
    rightTable.getRows.mockReturnValue([rightTableRow])

    const result: SyncResult = await Sync(payload)

    expect(result.toDeleteFromRight).toEqual([5])
  })

  it("should not delete rows from right table that are not deleted in the left table", async () => {
    const leftTable = {
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      otherColumns: ["anotherColumn"],
      getRows: jest.fn(),
    }
    const rightTable = { getRows: jest.fn() }
    const row: Row = { id: 1, name: "tolumi", createdAt: new Date(), updatedAt: new Date() }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    leftTable.getRows.mockReturnValue([])
    rightTable.getRows.mockReturnValue([row])

    const result: SyncResult = await Sync(payload)

    expect(result.toDeleteFromRight).toEqual([])
  })

  it("should delete rows from left table that are deleted in the right table", async () => {
    const leftTable = {
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      otherColumns: ["anotherColumn"],
      getRows: jest.fn(),
    }
    const rightTable = { getRows: jest.fn() }
    const yesterday = DateTime.now().minus({ days: 1 }).toJSDate()
    const leftTableRow: Row = { id: 6, name: "tolumi", createdAt: yesterday, updatedAt: yesterday }
    const rightTableRow: Row = { id: 1, name: "tolumi", createdAt: yesterday, updatedAt: yesterday, deletedAt: new Date() }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    leftTable.getRows.mockReturnValue([leftTableRow])
    rightTable.getRows.mockReturnValue([rightTableRow])

    const result: SyncResult = await Sync(payload)

    expect(result.toDeleteFromLeft).toEqual([6])
  })

  it("should update rows in right table that are updated in the left table", async () => {
    const leftTable = {
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      otherColumns: ["anotherColumn"],
      getRows: jest.fn(),
    }
    const rightTable = { getRows: jest.fn() }
    const row: Row = { name: "tolumi", updatedAt: new Date(2023, 5, 30) }
    const oldRow: Row = { ...row, updatedAt: new Date(2023, 5, 20) }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    leftTable.getRows.mockReturnValue([row])
    rightTable.getRows.mockReturnValue([oldRow])

    const result: SyncResult = await Sync(payload)

    expect(result.rowsToUpdateOnRight).toEqual([row])
  })

  it("should update rows in left table that are updated in the right table", async () => {
    const leftTable = {
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      otherColumns: ["anotherColumn"],
      getRows: jest.fn(),
    }
    const rightTable = { getRows: jest.fn() }
    const row: Row = { name: "tolumi", updatedAt: new Date(2023, 6, 1) }
    const oldRow: Row = { ...row, updatedAt: new Date(2023, 5, 30) }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    leftTable.getRows.mockReturnValue([oldRow])
    rightTable.getRows.mockReturnValue([row])

    const result: SyncResult = await Sync(payload)

    expect(result.rowsToUpdateOnLeft).toEqual([row])
  })
})

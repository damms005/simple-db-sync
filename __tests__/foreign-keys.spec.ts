import { Sync } from "../src/sync"
import { Row, SyncPayload, SyncResult, LeftTable, RightTable } from "../src/types"

describe("Sync", () => {
  it("should correctly sync rows with matching foreign keys in both tables", async () => {
    const now = new Date()
    const leftRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "John" },
      { column: 'createdAt', value: now },
      { column: 'updatedAt', value: now },
      { column: 'foreignKey', value: 2, denormalisedValue: "Doe" } // assuming foreign_key is a foreign key column
    ]
    const rightRow: Row = [
      { column: 'id', value: 5 },
      { column: 'name', value: "John" },
      { column: 'createdAt', value: now },
      { column: 'updatedAt', value: now },
      { column: 'foreignKey', value: 2, denormalisedValue: "Doe" } // assuming foreign_key is a foreign key column
    ]

    const leftTable: LeftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name", "foreignKey"],
      foreignKeyColumns: ["foreignKey"],
      rows: [leftRow],
    }
    const rightTable = {
      name: "right",
      rows: [rightRow],
      foreignKeyColumns: ["foreignKey"],
    }

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    }

    const result: SyncResult = Sync(payload)

    // Assuming that if the foreign keys match, there should be no changes in both tables
    expect(result.rowsToAddToRight).toEqual([])
    expect(result.rowsToAddToLeft).toEqual([])
    expect(result.rowsToUpdateOnRight).toEqual([])
    expect(result.rowsToUpdateOnLeft).toEqual([])
    expect(result.toDeleteFromRight).toEqual([])
    expect(result.toDeleteFromLeft).toEqual([])
  })

  it("should resolve conflicts by updating foreign keys based on last update times", async () => {
    const earlierTime = new Date('2023-10-01T12:00:00Z');
    const laterTime = new Date('2023-10-01T13:00:00Z');

    const leftRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "John" },
      { column: 'teamId', value: 2, denormalisedValue: "Red Team" }, // conflicting value
      { column: 'createdAt', value: earlierTime },
      { column: 'updatedAt', value: earlierTime } // earlier update time
    ];

    const rightRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "John" },
      { column: 'teamId', value: 3, denormalisedValue: "Blue Team" }, // conflicting value
      { column: 'createdAt', value: earlierTime },
      { column: 'updatedAt', value: laterTime } // later update time
    ];

    const leftTable: LeftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name"],
      rows: [leftRow],
      foreignKeyColumns: ["teamId"],
      denormalisationDetails: [{
        column: "teamId",
        denormalisationMap: [
          { normalisedColumnValue: 2, denormalisedColumnValue: "Red Team" },
          { normalisedColumnValue: 24, denormalisedColumnValue: "Blue Team" } // Added mapping for 'Blue Team'
        ]
      }]
    };

    const rightTable: RightTable = {
      name: "right",
      rows: [rightRow],
      foreignKeyColumns: ["teamId"],
      denormalisationDetails: [{
        column: "teamId",
        denormalisationMap: [{ normalisedColumnValue: 3, denormalisedColumnValue: "Blue Team" }]
      }]
    };

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    };

    const result: SyncResult = Sync(payload);


    const rowWithoutId = {
      name: "John",
      teamId: 24, // denormalised value 'Blue Team' corresponds to normalised value 3
      createdAt: new Date('2023-10-01T12:00:00Z'), // 1st October 2023, 13:00:00 GMT+0100
      updatedAt: new Date('2023-10-01T13:00:00Z') // 1st October 2023, 14:00:00 GMT+0100, matching the actual updatedAt
    }

    expect(result.rowsToUpdateOnLeft).toEqual([rowWithoutId])
  })

  it("should handle conflicts when foreign keys in left table do not match with right table", async () => {
    const now = new Date("2023-10-01T12:00:00Z");
    const later = new Date("2023-10-01T13:00:00Z");

    const leftRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "John" },
      { column: 'teamId', value: 1, denormalisedValue: "Red Team" }, // This foreign key does not have a corresponding match in the right table
      { column: 'createdAt', value: now },
      { column: 'updatedAt', value: now }
    ];

    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name", "teamId"],
      foreignKeyColumns: ["teamId"],
      rows: [leftRow],
      denormalisationDetails: [
        {
          column: "teamId",
          denormalisationMap: [
            { normalisedColumnValue: 1, denormalisedColumnValue: "Red Team" }
          ]
        }
      ]
    };

    const rightTable = {
      name: "right",
      rows: [],
      denormalisationDetails: [
        {
          column: "teamId",
          denormalisationMap: [
            { normalisedColumnValue: 1, denormalisedColumnValue: "Red Team" }
          ]
        }
      ]
    };

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    };

    const result: SyncResult = Sync(payload);

    const rowWithoutId = {
      name: "John",
      teamId: 1, // Assuming that the foreign key is resolved and added to the right table
      createdAt: now,
      updatedAt: now
    };

    expect(result.rowsToAddToRight).toEqual([rowWithoutId]);
  })

  it("should handle conflicts when foreign keys in right table do not match with left table", async () => {
    const now = new Date("2023-10-01T12:00:00Z");

    const rightRow: Row = [
      { column: 'id', value: 1 },
      { column: 'name', value: "John" },
      { column: 'teamId', value: 2, denormalisedValue: "Blue Team" }, // This foreign key does not have a corresponding match in the left table
      { column: 'createdAt', value: now },
      { column: 'updatedAt', value: now }
    ];

    const leftTable = {
      name: "left",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name", "teamId"],
      rows: [],
      denormalisationDetails: [
        {
          column: "teamId",
          denormalisationMap: [
            { normalisedColumnValue: 1, denormalisedColumnValue: "Red Team" },
            { normalisedColumnValue: 2, denormalisedColumnValue: "Blue Team" } // Added missing denormalisation detail
          ]
        }
      ]
    };

    const rightTable = {
      name: "right",
      primaryKey: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt",
      comparisonColumns: ["name", "teamId"],
      foreignKeyColumns: ["teamId"],
      rows: [rightRow],
      denormalisationDetails: [
        {
          column: "teamId",
          denormalisationMap: [
            { normalisedColumnValue: 2, denormalisedColumnValue: "Blue Team" }
          ]
        }
      ]
    };

    const payload: SyncPayload = {
      leftTable,
      rightTable,
    };

    const result: SyncResult = Sync(payload);

    const rowWithoutId = {
      name: "John",
      teamId: 2, // The foreign key is resolved and added to the left table
      createdAt: now,
      updatedAt: now
    };

    expect(result.rowsToAddToLeft).toEqual([rowWithoutId]);
  })

  it('should throw an error when right table does not provide denormalisation details', async () => {
    // Simulate a left table with a row having a foreign key
    const leftTable: LeftTable = {
      name: 'leftTable',
      primaryKey: 'id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
      comparisonColumns: ['name', 'teamId'],
      rows: [[{
        column: 'id',
        value: 1,
      }, {
        column: 'name',
        value: 'John',
      }, {
        column: 'teamId',
        value: 1,
        denormalisedValue: 'Red Team',
      }]],
      foreignKeyColumns: ['teamId'],
      denormalisationDetails: [{
        column: 'teamId',
        denormalisationMap: [{
          normalisedColumnValue: 1,
          denormalisedColumnValue: 'Red Team',
        }],
      }],
    };

    // Simulate a right table with no rows and no denormalisationDetails
    const rightTable: RightTable = {
      name: 'rightTable',
      rows: [],
    };

    // Assert that an error should be thrown due to lack of denormalisationDetails in the right table
    expect(() => Sync({ leftTable, rightTable })).toThrow('Right table does not provide denormalisation details');
  })

  it('should throw an error when left table does not provide denormalisation details', async () => {
    // Simulate a left table with no rows and no denormalisationDetails
    const leftTable: LeftTable = {
      name: 'leftTable',
      primaryKey: 'id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
      comparisonColumns: ['name', 'teamId'],
      rows: [],
    };

    // Simulate a right table with a row having a foreign key
    const rightTable: RightTable = {
      name: 'rightTable',
      rows: [[{
        column: 'id',
        value: 1,
      }, {
        column: 'name',
        value: 'John',
      }, {
        column: 'teamId',
        value: 1,
        denormalisedValue: 'Red Team',
      }]],
      foreignKeyColumns: ['teamId'],
      denormalisationDetails: [{
        column: 'teamId',
        denormalisationMap: [{
          normalisedColumnValue: 1,
          denormalisedColumnValue: 'Red Team',
        }],
      }],
    };

    // Assert that an error should be thrown due to lack of denormalisationDetails in the left table
    expect(() => Sync({ leftTable, rightTable })).toThrow('Left table does not provide denormalisation details');
  })

  it('should correctly map and sync foreign key columns with different names in left and right tables', async () => {
    // Define left table with a foreign key column named differently than in the right table
    const leftTable: LeftTable = {
      name: 'leftTable',
      primaryKey: 'id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
      comparisonColumns: ['teamId'],
      mapToRightColumn: { teamId: 'squadId' }, // Mapping the different column names
      rows: [
        [{ column: 'id', value: 1 }, { column: 'name', value: 'John' }, { column: 'teamId', value: 1, denormalisedValue: 'Red Team' }],
      ],
      foreignKeyColumns: ['teamId'],
      denormalisationDetails: [{
        column: 'teamId',
        denormalisationMap: [{ normalisedColumnValue: 1, denormalisedColumnValue: 'Red Team' }]
      }]
    };

    // Define right table with a foreign key column named differently than in the left table
    const rightTable: RightTable = {
      name: 'rightTable',
      rows: [],
      foreignKeyColumns: ['squadId'],
      denormalisationDetails: [{
        column: 'squadId',
        denormalisationMap: [{ normalisedColumnValue: 1, denormalisedColumnValue: 'Red Team' }]
      }]
    };

    // Perform sync operation
    const syncResult = await Sync({ leftTable, rightTable });

    // Assert that the rows are correctly synced despite the different foreign key column names
    expect(syncResult.rowsToAddToRight).toEqual([{ name: 'John', squadId: 1 }]);
  })
})

# Simple DB Sync

Perform data synchronization between two database tables, even when column names differ.

> **Note:**
> This package is intended for scenarios where traditional database synchronization methods like master-slave replications or writes forwarding are not suitable. Please consider those alternatives before using this package. See below for typical use-cases.

> **Warning:**
> Always run tests before deploying to production environments.

## Typical Use-Case

- An Arduino with a local offline database that intermittently connects online and needs to sync with a remote server/database.
- Google Sheets with different headers that need to be merged. You can write a script or dump it in a database and sync up with this tool.
- A local SQLite database and a remote MySQL server with different schemas that need some tables to be in sync.

## Installation

```sh
npm install simple-db-sync
```

## Usage

Basically, you need to do three things:

- Import the main object:

```javascript
import { Sync } from "simple-db-sync"
```

- Call the sync function to perform the sync task:

```javascript
  const result: SyncResult = Sync(syncPayload)
```

Usually, you may utilize dflknf to build the `syncPayload`

- Finally, consume the result of the sync task. See the Output section below for more details

### Logging (Optional)

When you're done syncing, the response contains a function called. `updateSyncTimes`. You can use this function to store details of the sync. A table called `simple_db_sync_tracking` will be used for this (it will be created if not already exists). Note that [Sequelize](https://sequelize.org) is required for this particular feature.

For subsequent sync, you can then use the `getSyncWhereClauseFor( table )` function to get the `WHERE` clause segment of your `SELECT` statement for the next sync

```javascript
import { getSyncWhereClauseFor } from "simple-db-sync/dist/logger"
const whereClause = getSyncWhereClauseFor(table, sequelize)
```

```sql
SELECT * FROM table WHERE {whereClause}
```

### Input - [SyncPayload](types.d.ts):

Provide the following for the left table. Check the [type definition](types.d.ts) for more details:

- **Primary Key**: The main column that uniquely identifies each row.
- **Timestamp Columns**: Specify when rows were created, updated, or deleted.
- **Comparison Columns**: Columns that should uniquely identify rows.
- **Mapping** (Optional): Map columns in the left table to those with different names in the right table.

### Output - [SyncResult](types.d.ts):

- **Rows to Add**: Rows to be added to either table.
- **Rows to Delete**: Rows to be removed from either table.
- **Rows to Update**: Rows to be updated on either side.

## How It Works

1. **Identify Unique Rows**: Identifies unique rows in both tables using column differences.
2. **Synchronize Timestamps**: Uses timestamp columns to manage new, modified, or deleted rows.
3. **Map Column Names**: Aligns columns with different names using mapping information.
4. **Handle Specific Conditions**: Considers only rows that satisfy provided conditions for syncing.
5. **Response**: Returns rows to be added, updated, or removed. Consume the response as necessary.
6. **Optional Sync API**: Log sync time to the database for filtering rows in subsequent syncs.

## Tests

Run the tests using:

```sh
npm test
```

## Contribute

Pull requests are welcome! Please include tests for new features or modifications.

## Support and Issues

For support or to report issues, please submit an issue.

## License

MIT License.

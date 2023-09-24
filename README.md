# Simple DB Sync

Perform bi-directional synchronization between two tables, even when column names differ.

> **Note**
> This package is not the best way to sync databases. You should first consider better alternatives like master-slave replications, writes forwarding, etc.
> It is only when none of those alternatives is desirable that you should consider this package. See below for typical use-case.

> **Warning**
> Warning: Ensure to run tests before you shift gears.

## Typical use-case

Scenario:

- An Arduino that has local offline db but still connects online intermittently and need to be in sync with remote server/db
- Google Sheets with different headers and need to be merged. Either write some script or just dump it in db and sync up with this tool.
- A local SQLite db and remote MySQL server with different schema that need some tables to be in sync.

## Installation

```shell
npm i simple-db-sync
```

## Usage

```javascript
import { Sync } from "simple-db-sync"
```

1. **Input - [SyncPayload](types.d.ts):**

   - You will provide the following for the left table. Check the [type definition](types.d.ts) for more details:

     - **Primary Key**: The main column that uniquely identifies each row.
     - **Timestamp Columns**: Specify when rows were created, updated, or deleted.
     - **Comparison Columns**: Columns that should uniquely identify rows
     - **Mapping** (Optional): If columns in the left table have different names than in the right table, map them.

2. **Output [SyncResult](types.d.ts):**
   - **Rows to Add**: Provide what to add to either table.
   - **Rows to Delete**: Provide what need to be removed from either table.
   - **Rows to Update**: Provide what to update on either side

## How it works:

1. **Identify Unique Rows**: Using the column differences unique rows are identified in both tables.

2. **Synchronize Timestamps**: Checks the timestamp columns and use the information to identify and manage new, modified, or deleted rows.

3. **Map Column Names**: If the two tables have columns with different names, it uses the mapping information to align them. This ensures the correct columns are compared and synced.

4. **Handle Specific Conditions**: If conditions are provided, only rows that satisfy these conditions are considered for syncing.

5. **Response**: After analyzing differences, the following is returned:

   - Rows to be added to either table.
   - Rows to be updated if changes are detected.
   - Entries to be removed based on deletion timestamps or other conditions. Should should then take consume the response as necessary.

6. Optionally, you can also use the Sync API to log sync time to the database, such that for subsequent sync, you can get the last sync time and use that to filter rows to compare.

## Tests

Run the tests using:

```bash
npm run test
```

## Contribute

Pull requests are welcome! Ensure to include tests for new features or when necessary.

## License

MIT License.

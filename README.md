# Simple DB Sync

Perform bi-directional synchronization between two tables, even when column names differ.

## Installation

```javascript
import { Sync } from "simple-db-sync"
```

## Usage

1. **Input - [SyncPayload](types.d.ts):**

   - You will provide the following for the left table. Check the [type definition](types.d.ts) for more details:

     - **Primary Key**: The main column that uniquely identifies each row.
     - **Timestamp Columns**: Specify when rows were created, updated, or deleted.
     - **Additional Columns**: Any other columns not previously mentioned.
     - **Mapping** (Optional): If columns in the left table have different names than in the right table, map them.
     - **Conditions** (Optional): The `where` clause constraint for row selection.

2. **Output [SyncResult](types.d.ts):**
   - **Rows to Add**: Provide what to add to either table.
   - **Rows to Delete**: Provide what need to be removed from either table.
   - **Rows to Update**: Provide what to update on either side

### How it works:

1. **Identify Unique Rows**: Using the column differences unique rows are identified in both tables.

2. **Synchronize Timestamps**: Checks the timestamp columns and use the information to identify and manage new, modified, or deleted rows.

3. **Map Column Names**: If the two tables have columns with different names, it uses the mapping information to align them. This ensures the correct columns are compared and synced.

4. **Handle Specific Conditions**: If conditions are provided, only rows that satisfy these conditions are considered for syncing.

5. **Produce Sync Plan**: After analyzing differences, a sync plan is generated. This plan includes:
   - Rows to be added to either table.
   - Rows to be updated if changes are detected.
   - Entries to be removed based on deletion timestamps or other conditions.

### Tests

Run the tests using:

```bash
npm run test
```

## Contribute

Pull requests are welcome! Ensure to include tests for new features or when necessary.

## License

MIT License.

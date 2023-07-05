# DB-Sync

This JavaScript module provides a function `BiDirectionalSync` that performs a bi-directional synchronization between two tables. It also exports a helper function `getRightTableColumnEquivalence` that maps columns from the left table to the right table.

## Installation

To use this module in your project, you can import it as follows:

```javascript
import { BiDirectionalSync, getRightTableColumnEquivalence } from "../src/bi-directional-sync";
```

## Usage

### BiDirectionalSync Function

The `BiDirectionalSync` function takes a `SyncPayload` object as an argument and returns a `SyncResult` object. The `SyncPayload` object should have the following properties:

- `leftTable`: The left table to be synchronized.
- `rightTable`: The right table to be synchronized.
- `primaryKeyColumnLeftTable`: The primary key column of the left table.
- `createdAtColumnLeftTable`: The created at column of the left table.
- `updatedAtColumnLeftTable`: The updated at column of the left table.
- `deletedAtColumnLeftTable`: The deleted at column of the left table.
- `otherColumnsInLeftTable`: Other columns in the left table.
- `leftTableWhereClause`: (Optional) Where clause for the left table.
- `leftColumnsMapToRightColumn`: (Optional) Mapping of left table columns to right table columns.

The `SyncResult` object returned by the function has the following properties:

- `rowsToAddToRight`: Rows to be added to the right table.
- `rowsToDeleteFromRight`: Rows to be deleted from the right table.
- `rowsToDeleteFromLeft`: Rows to be deleted from the left table.
- `rowsToUpdateOnRight`: Rows to be updated on the right table.
- `rowsToUpdateOnLeft`: Rows to be updated on the left table.
- `rowsToAddToLeft`: Rows to be added to the left table.

### getRightTableColumnEquivalence Function

The `getRightTableColumnEquivalence` function takes a column name from the left table and a mapping of left table columns to right table columns, and returns the equivalent column in the right table. If there is no equivalent column in the map, it returns the same column name.

## Tests

The module includes Jest tests to validate its functionality. The tests cover the following scenarios:

- Mapping of left table columns to right table columns.
- Adding missing rows from the left table to the right table.
- Adding missing rows from the right table to the left table.
- Deleting rows from the right table that are deleted in the left table.
- Deleting rows from the left table that are deleted in the right table.
- Updating rows in the right table that are updated in the left table.
- Updating rows in the left table that are updated in the right table.

To run the tests, use the following command:

```bash
npm run test
```

## Contributing

Contributions are welcome. Please submit a pull request with any enhancements or bug fixes. Be sure to include unit tests for any new functionality.

## License

This project is licensed under the MIT License.
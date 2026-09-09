# Validation

## Automated checks

Run `npm test` from `backend`. The current 18 checks cover:

- Salted password hashing, password verification, safe login responses and logout.
- Registration cannot request admin privileges.
- Anonymous/customer requests cannot perform admin actions or read another user's order history.
- Profile changes use the logged-in identity, preserve a blank password, and hash a changed password.
- Checkout ignores submitted price/identity, validates quantities and duplicate books, and records the unit price.
- Failed stock checks and simulated write failures leave no partial order in the database double.
- Restock confirmation applies once; manual requests reject an existing pending request.
- The previous-month query uses calendar boundaries; invalid report dates are rejected.
- Cross-origin browser writes are rejected.
- Customer cart, profile form, and admin restock/edit controls call the intended endpoints.
- Book titles containing HTML display as text in the tested catalogue/cart/edit paths.

All 18 checks passed during this update. The dependency audit reported zero known vulnerabilities at that time. Neither result is a production-readiness guarantee.

## Live MySQL verification

A GitHub Actions workflow now imports the real SQL files and runs six integration tests via `npm run test:mysql`. It covers checkout/history, rollback on a failed write, automatic/manual restocking, stock protection, last-copy contention, and calendar-month reports. See [Actions instructions](github-actions.md). The hosted result is pending until the workflow is pushed and runs; configuration alone is not a passing result. The legacy migration is not included in the real-MySQL suite.

A MySQL server was not available during this update, so the following were not independently executed against MySQL: schema/seed imports, migration, trigger execution, SQL report results, and concurrent row locking. The tests' database double does not establish those properties.

With a fresh local database, check:

1. Import schema, seed, and triggers; create an admin and register a customer.
2. Buy two copies of a book. Confirm the order total and stock deduction. Change its catalogue price and confirm the stored `ORDER_ITEMS.UnitPrice` stays unchanged.
3. Attempt an order exceeding available stock. Confirm there is no partial order or stock deduction.
4. Reduce a book from at/above its threshold to below it. Confirm a single pending restock request is created. Confirming it once adds stock; repeating confirmation must not add stock again.
5. Create a request for a book already below threshold. Repeating the request should return a conflict until the pending request is confirmed.
6. Use two customer sessions to attempt buying the last available copy. Confirm only one succeeds.
7. Add sample orders on either side of a calendar-month boundary and confirm the previous-month report excludes the current month.
8. On a backed-up copy of old data, run migration twice and check existing users/orders remain intact and legacy item prices remain unknown.

The UI screenshots in the README come from the original academic demonstration.

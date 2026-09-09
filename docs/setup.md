# Setup

## Requirements

- Node.js 22.13 or newer and npm.
- MySQL 8.0.16 or newer, using InnoDB tables so transactions, row locks and CHECK constraints are supported.
- A local MySQL account with access to the bookstore database.

The app binds to 127.0.0.1 and uses an in-memory session store. It is configured as a local academic demo.

## 1. Install dependencies

From the repository root:

```sh
cd backend
npm ci
```

Copy `.env.example` to `.env` in this folder. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and `DB_NAME` for your local database. The supplied schema creates `BookstoreDB`.

Generate a session secret, then paste it into `SESSION_SECRET` in `.env`:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The environment file is ignored by Git. If no session secret is supplied, the app generates a temporary one; all sessions are also lost when the server restarts because the session store is in memory.

## 2. Create a fresh database

From the repository root, open the MySQL client with an account that can create tables and triggers:

```sh
mysql -u root -p
```

At the MySQL prompt:

```sql
SOURCE db/schema.sql;
SOURCE db/seed.sql;
SOURCE db/triggers.sql;
```

The seed adds publishers and five sample books. It contains no user passwords or customer orders. Reports start at zero until you place demo orders. The first sample book is already below its threshold: an admin can create its first replenishment request manually. Automatic requests occur when an update crosses from at/above the threshold to below it.

Do not run the fresh schema over an existing database. Use the upgrade section below if you have data to preserve.

## 3. Create the administrator

From `backend`, set a password of 8-128 characters in your terminal environment. For example, in PowerShell:

```powershell
$env:ACCOUNT_PASSWORD = Read-Host 'Choose a local admin password' -MaskInput
npm run create-user -- admin admin
Remove-Item Env:ACCOUNT_PASSWORD
```

`Read-Host -MaskInput` requires PowerShell 7.1+. On older PowerShell, use a secure prompt and convert it only when setting the process environment:

```powershell
$accountSecret = Read-Host 'Choose a local admin password' -AsSecureString
$env:ACCOUNT_PASSWORD = [System.Net.NetworkCredential]::new('', $accountSecret).Password
npm run create-user -- admin admin
Remove-Item Env:ACCOUNT_PASSWORD
```

On Bash:

```sh
read -s -p 'Choose a local admin password: ' ACCOUNT_PASSWORD
export ACCOUNT_PASSWORD
npm run create-user -- admin admin
unset ACCOUNT_PASSWORD
```

This inserts a hashed password and an admin role. It refuses to overwrite an existing username. Customers can register through the login page; public registration cannot create admins. The same command accepts `customer` as its final argument if you want to create a customer from the terminal.

## 4. Run

```sh
npm start
```

Open [localhost:3000](http://localhost:3000), log in as the admin, or register a customer. `npm run dev` runs the same server with automatic restarts during development. Change `PORT` in `.env` if needed.

## Upgrade an existing database

Back up the database first. MySQL schema changes are not rolled back as a single transaction.

1. Install dependencies and configure `.env` as above.
2. From `backend`, run `npm run migrate` against that configured database.
3. From the repository root, open the MySQL client and run `SOURCE db/triggers.sql;` to update restock behavior.
4. Create a separate admin account with `npm run create-user -- admin admin` and `ACCOUNT_PASSWORD` set.

The migration adds `CUSTOMER.Role` and `ORDER_ITEMS.UnitPrice` if missing and hashes existing plain-text passwords. It does not remove users or orders. Existing users become customers by default. Existing order items keep `UnitPrice = NULL` because the original schema did not record purchase prices; new orders record their actual database price. Historical order totals are retained. The fresh schema has additional nonnegative/positive numeric constraints; the upgrade does not retrofit those constraints onto potentially incompatible old rows. Server-side validation applies to new app requests in both cases.

The original seed file included a restock status inconsistent with its CHECK constraint. Do not re-import the old seed. If an older database contains nonstandard restock statuses or manually edited data, review those rows before using it with the app.

## Checks

```sh
npm test
```

Tests use the real Express routes/session middleware with a database double and run the page scripts in a DOM environment. They do not require MySQL. See [validation notes](validation.md) for coverage and the remaining live-database check.

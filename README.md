# Bookstore Order Processing System

An academic three-layer application with a browser interface, an Express backend, and a MySQL database. Customers browse books and place simulated orders; administrators manage inventory, restock requests, and sales reports.

## Features

### Customers

- Register and log in with a server-side session.
- Search by ISBN, title, author, publisher, or category.
- Keep a shopping cart across page refreshes.
- Place a demo order using current database prices and available stock.
- Update their own profile; leaving the password blank keeps it unchanged.
- View their own order history.

Checkout does not collect card details, charge money, or contact a payment provider. It records an order and updates inventory.

### Administrators

- Add books and authors under an existing publisher, and edit titles, prices, and stock.
- View customer orders and books below their stock thresholds.
- Record a manual request for 10 copies from the low-stock screen, unless a pending request already exists.
- Confirm a restock receipt once, updating stock within a transaction.
- View sales for the previous calendar month or a selected day, top customers/books over the last three months, and replenishment request counts/quantities.

Restock requests are records in the database; no email or order is sent to a publisher. The replenishment report counts requests, including pending ones, rather than claiming all requested copies have arrived.

## Application structure

```text
HTML / CSS / JavaScript
          |
       JSON API
          |
Node.js / Express (server.js)
          |
MySQL connection pool (db.js)
          |
Tables, constraints, and triggers
```

The existing backend keeps routes and SQL operations in `server.js`. Password helpers and access checks are in `auth.js`. The frontend remains plain HTML, CSS, and JavaScript.

## Important decisions

- **Transactions and row locks:** checkout locks books in a consistent order and checks stock before recording the order. A failed transaction is rolled back. Restock confirmation locks its request before changing stock.
- **Authoritative prices:** the backend ignores prices and usernames supplied with checkout. It uses the authenticated customer and the database price, saving `UnitPrice` with each order item.
- **Inventory constraints:** the fresh schema rejects negative stock/prices and nonpositive order quantities. Server validation also checks incoming values.
- **Automatic restocking:** when an update moves stock from at/above its threshold to below it, a trigger creates a pending request for 10 copies if none is already pending. Initially low-stock books can be requested manually.
- **Authentication:** passwords use salted scrypt hashes. Admin operations require a server-checked admin session; localStorage is only used for display details and the cart. Logout destroys the session.

## Setup

Requirements: Node.js 22.13+ and MySQL 8.0.16+ with InnoDB. Exact npm dependencies are in `backend/package.json` and `backend/package-lock.json`.

1. Run `npm ci` in `backend`.
2. Copy `backend/.env.example` to `backend/.env` and configure your database and session secret.
3. Import `db/schema.sql`, `db/seed.sql`, and `db/triggers.sql` in that order into a fresh local database.
4. Create an administrator using `npm run create-user -- admin admin` with `ACCOUNT_PASSWORD` set in your terminal environment. Customers register in the UI.
5. Run `npm start` from `backend` and open [localhost:3000](http://localhost:3000).

See [detailed setup and existing-database upgrade instructions](docs/setup.md) for commands. The sample data contains books and publishers; customer accounts and sales are created through the app. Do not run the fresh schema over existing data.

## Tests

```sh
cd backend
npm test
```

The 18 tests exercise authentication, permissions, profile changes, checkout, restocking, report boundaries, and frontend interactions. They use a database double and a DOM environment.

[GitHub Actions](docs/github-actions.md) runs these checks plus six integration tests against a disposable MySQL 8.4 database on every push or pull request. It imports the SQL files and checks real transactions, restock triggers, report results, and concurrent purchases. No local MySQL installation is needed to use Actions. The first hosted run is still pending; see [validation notes](docs/validation.md).

## Diagrams and screenshots

These diagrams and screenshots were captured for the original university submission. They show the original data model and interface, not a new validation run. The current SQL schema additionally includes user roles and historical unit prices, and checkout is now explicitly simulated.

### Original ER diagram

![Original bookstore ER diagram](README_images/ER_diagram.png)

### Original relational schema

![Original relational schema](README_images/Relational_Schema.png)

### Book catalogue

![Original book catalogue screen](README_images/Browse_Books.png)

### Inventory management

![Original admin edit-books screen](README_images/Admin_Edit_Books.png)

### Reports

![Original admin reports screen](README_images/Admin_System_Reports.png)

The remaining original UI captures are kept in `README_images/`.

## Limitations

- This is a local academic demo with simulated checkout, not a production storefront.
- Sessions use the default in-memory store and expire after eight hours or on server restart. Public hosting would need a persistent session store, HTTPS configuration, and further operational/security review.
- Publisher records are loaded through SQL; there is no publisher-management screen.
- Automatic requests use a fixed quantity of 10 and trigger on a threshold crossing, not every low-stock update.
- When upgrading old data, historical unit prices remain unknown because the original schema did not save them. Existing order totals are preserved.
- The diagrams and screenshots document earlier academic work. The SQL files and current routes define present behavior.

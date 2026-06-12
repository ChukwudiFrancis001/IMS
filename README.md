# Inventory Management System

This is a Node.js, Express, EJS, and MySQL inventory management system.

## Project Objectives Covered

1. **Normalized relational database**: `database/schema.sql` separates users, categories, products, transactions, alerts, and audit logs with foreign keys.
2. **Automated stock calculation**: stock is calculated from transactions as `SUM(stock_in) - SUM(stock_out)`.
3. **Low-stock notifications**: every transaction evaluates the product threshold and creates or resolves alerts.
4. **Secure authentication and audit trail**: users log in with bcrypt-hashed passwords; stock/product/user changes are written to `audit_log`.
5. **Graphical analytics**: `/reports/analytics` renders chart data from transactions and current stock.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ims_db
SESSION_SECRET=replace_this_with_a_long_random_value
PORT=3000
```

3. Import the database:

```bash
mysql -u root -p < database/schema.sql
```

If you already had an older database from a previous version of the project, run:

```bash
npm run migrate
```

4. Create the first admin user:

```bash
npm run create-admin
```

By default this creates:

- Username: `admin`
- Password: `admin123`

You can override that before running the script:

```bash
ADMIN_USERNAME=manager ADMIN_PASSWORD=change_me npm run create-admin
```

5. Start the app:

```bash
npm start
```

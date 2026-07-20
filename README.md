# Inventory Management System

A web-based Inventory Management System (IMS) for Small and Medium Enterprises (SMEs), built with Node.js, Express, Supabase (PostgreSQL), and Chart.js.

## Features

- **Product Management**: CRUD operations with SKU tracking, categories, and soft deletion
- **Stock Transactions**: Atomic stock-in/stock-out with row-level locking and race-condition prevention
- **Automated Alerts**: Threshold-based notification system with idempotent evaluation
- **Authentication & Authorization**: Supabase Auth with JWT sessions, role-based access control (Admin/Staff)
- **Staff Self-Registration**: User registration with admin approval workflow
- **Audit Trail**: Immutable log of every data-modifying operation with user attribution
- **Complaint Management**: Track and resolve product quality issues
- **Analytics Dashboard**: Interactive charts (stock trends, top products, threshold visualization)
- **Password Reset**: Self-service password reset via Supabase email

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Templates**: EJS
- **Charts**: Chart.js
- **Session**: express-session

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SESSION_SECRET=your_session_secret
PORT=3000
```

3. Run the database schema in Supabase SQL Editor (`database/schema.sql`)

4. Create an admin user:
```bash
node scripts/create-admin.js
```

5. Start the server:
```bash
node app.js
```

6. Access at `http://localhost:3000`

## Project Structure

```
├── app.js                 # Express application setup
├── config/
│   └── db.js              # Supabase client initialization
├── controllers/           # Route handlers
├── middleware/             # Auth & RBAC middleware
├── models/                # Database operations
├── routes/                # Express routes
├── views/                 # EJS templates
├── public/                # Static assets (CSS, JS)
├── database/
│   ├── schema.sql         # Full database schema
│   └── fix_rpc.sql        # RPC fix script
└── scripts/
    └── create-admin.js    # Admin user creation
```

## Default Admin Credentials

- Email: `admin@ims.com`
- Password: `admin123`

## License

This project is for academic purposes.

# Ticket Booking System

A full-stack, comprehensive booking platform for movies and concerts featuring real-time visual seat maps, TTL-based seat holds, secure checkout, role-based dashboards, and automated waitlist assignment.

## Features

- **Interactive Seat Maps**: Customers can visually browse venues and select individual seats, color-coded by pricing category. 
- **Real-time Synchronization**: WebSockets instantly broadcast seat status changes across all active sessions, preventing double-bookings.
- **Robust Checkout & Holds**: When a user selects a seat, it is temporarily placed on "Hold" with a precise time-to-live (TTL). If they abandon the checkout, a background sweeper automatically releases the seat back to the pool.
- **Waitlist & Offers**: If an event sells out, customers can join a waitlist. If seats are released, the system automatically emails the next person in line a time-sensitive, cryptographically secure offer link.
- **Ethereal Email Delivery**: Upon a successful booking, the system generates a secure QR-code ticket and emails it directly to the customer as an attachment. 
- **Role-Based Access Control**:
  - **Customers**: Browse events, book seats, and manage booking history.
  - **Organisers**: Access private dashboards to monitor total revenue, ticket sales, list new events, and schedule shows with dynamic pricing across categories.
  - **Admins**: Dynamically build new venues by defining grid layouts (Rows/Columns) and mapping physical seat generation for the entire platform.

## Tech Stack

- **Frontend**: React (TypeScript), Vite, TailwindCSS, React Router
- **Backend**: Node.js, Express (TypeScript), Socket.IO
- **Database**: Prisma ORM, SQLite
- **Utilities**: JSON Web Tokens (JWT), node-cron (Sweeper), qrcode, Nodemailer (Ethereal Email fallback)

## Getting Started

### 1. Install Dependencies
Run the following command in both the `/client` and `/server` directories:
```bash
npm install
```

### 2. Environment Variables
In the `/server` directory, copy the example environment file:
```bash
cp .env.example .env
```
Ensure your `.env` contains the required secrets:
```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_secure_jwt_secret"
QR_SECRET="your_secure_qr_secret"
CLIENT_URL="http://localhost:5173"
```

### 3. Initialize the Database
In the `/server` directory, push the schema to the database and optionally seed it with default data:
```bash
npx prisma db push
npm run seed
```

### 4. Start the Application
You will need two separate terminal windows.

**Start the Backend Server:**
```bash
cd server
npm run dev
```

**Start the Frontend Client:**
```bash
cd client
npm run dev
```

The application will be accessible at `http://localhost:5173`. 
*(Note: To access Organiser or Admin capabilities, create a new account via the frontend registration page and select the desired role).*

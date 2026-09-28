# Price Tracker

Price Tracker is a web application for searching products and keeping track of their prices.

The application uses React for the frontend, Node.js and Express for the backend, PostgreSQL for storing data, and Python with Playwright for collecting product information.

## Live Application

Frontend:

`https://price-trackeer.vercel.app`

Backend:

`https://price-tracker-backend-vz5k.onrender.com`

## Features

* Search for products
* View product details
* Add products to tracking
* View tracked products
* Store product prices in PostgreSQL
* Update tracked product information
* Store the last checked time
* Run product tracking jobs
* Use Playwright to collect product data
* REST API for communication between frontend and backend
* Production deployment using Vercel and Render

## Technologies Used

### Frontend

* React
* Vite
* JavaScript
* CSS
* Fetch API

### Backend

* Node.js
* Express.js
* PostgreSQL
* pg
* CORS
* dotenv

### Scraping

* Python
* Playwright

### Deployment

* Vercel
* Render
* PostgreSQL

## Project Structure

```text
Price-Tracker/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── db/
│   │   └── db.js
│   ├── app.js
│   ├── package.json
│   └── .env
│
├── python/
│   └── ...
│
├── .github/
│   └── workflows/
│       └── ...
│
└── README.md
```

## How It Works

The application works in the following way:

1. The user searches for a product from the frontend.
2. The frontend sends a request to the Express backend.
3. The backend gets the required product information.
4. The user can add a product to the tracking list.
5. The tracking details are saved in PostgreSQL.
6. The backend checks the products that need to be tracked.
7. A Python script uses Playwright to collect the latest product information.
8. The collected data is stored in PostgreSQL.
9. The frontend gets the updated information from the backend.

## API

### Get Products

```text
GET /api/products
```

Used to get product information.

### Add Tracked Product

```text
POST /api/tracked-products
```

Adds a product to the tracking list.

### Get Tracked Products

```text
GET /api/tracked-products
```

Returns the products currently being tracked.

## Database

PostgreSQL is used to store product and tracking information.

The database contains information such as:

* Product
* Card code
* Department
* Brand
* Price
* Tracking status
* Last checked time
* Created time

The database structure can change as the project is updated.

## Python Scraper

The backend starts the Python script when a tracking job needs to run.

The basic flow is:

```text
Node.js
   |
   | starts Python process
   v
Python
   |
   | uses Playwright
   v
Product Website
   |
   v
Product Data
   |
   v
PostgreSQL
```

Node.js manages the tracking jobs, while Python and Playwright are used to collect product information.

## Environment Variables

Create a `.env` file in the backend directory.

Example:

```env
PORT=5000

DATABASE_URL=your_postgresql_connection_string

FRONTEND_URL=https://price-trackerr.vercel.app

FRONTEND_PREVIEW_URL=https://your-preview-url.vercel.app
```

Do not upload the `.env` file to GitHub.

Add it to `.gitignore`:

```text
.env
```

## CORS

The backend accepts requests from the frontend URLs configured through environment variables.

Example:

```js
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_PREVIEW_URL
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
}));
```

This allows the frontend URLs to be changed without modifying the backend source code.

## Run the Project Locally

### Clone the repository

```bash
git clone https://github.com/ayush7166/Price-Tracker.git
cd Price-Tracker
```

### Frontend

Go to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

### Backend

Open another terminal and go to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create the `.env` file and add the required database and frontend settings.

Start the backend:

```bash
npm start
```

If nodemon is configured:

```bash
nodemon app.js
```

## PostgreSQL with Docker

If PostgreSQL is running in Docker, check the running containers:

```bash
docker ps
```

Open the PostgreSQL terminal:

```bash
docker exec -it <postgres-container-name> psql -U postgres
```

To connect to a specific database:

```bash
docker exec -it <postgres-container-name> psql -U postgres -d <database-name>
```

Some useful PostgreSQL commands:

```sql
\l
```

Show databases.

```sql
\dt
```

Show tables.

```sql
SELECT * FROM tracking_jobs;
```

Show tracking jobs.

```sql
\q
```

Exit PostgreSQL.

## Deployment

### Frontend

The frontend is deployed on Vercel.

The production build is created using:

```bash
npm run build
```

### Backend

The backend is deployed on Render.

The required environment variables are added through the Render service settings.

The database connection and frontend URLs should be configured through environment variables instead of being written directly in the source code.

## Future Improvements

* Add user login and authentication
* Add price history
* Add price drop notifications
* Add email notifications
* Add more product sources
* Improve scraper error handling
* Add a user dashboard
* Add product comparison
* Improve background tracking jobs
* Add better logging

## Author

Ayush Bansal

GitHub:

`https://github.com/ayush7166`

const { Pool } = require("pg");

const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "price_tracker"
});

pool.on("connect", async (client) => {
  await client.query("SET TIME ZONE 'Asia/Kolkata'");
  console.log("Connected to PostgreSQL - IST");
});
pool.on("error", (error) => {
    console.error("PostgreSQL error:", error);
});

module.exports = pool;
const { Pool } = require("pg");

const pool = new Pool({
     connectionString: process.env.DATABASE_URL
});

pool.on("connect", async (client) => {
  await client.query("SET TIME ZONE 'Asia/Kolkata'");
  console.log("Connected to PostgreSQL - IST");
});
pool.on("error", (error) => {
    console.error("PostgreSQL error:", error);
});

module.exports = pool;
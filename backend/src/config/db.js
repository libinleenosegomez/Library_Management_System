const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // Never crash the process on an idle client error - log and continue.
  console.error("Unexpected PostgreSQL error on idle client", err);
});

module.exports = pool;

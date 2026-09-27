require("dotenv").config();
const pool = require("./db/db");
const { spawn } = require("child_process");
const path = require("path");

async function main() {
  try {
    // Get only active tracking jobs
    const result = await pool.query(`
            SELECT *
            FROM tracking_jobs
            WHERE tracking_active = TRUE
        `);

    console.log(`Found ${result.rows.length} active tracking jobs`);

    for (const job of result.rows) {
      console.log(`Tracking job ${job.id} - card ${job.card_code}`);

      await runScraper(job);
    }

    console.log("Price tracking completed");
  } catch (error) {
    console.error("Worker error:", error);

    process.exit(1);
  } finally {
    await pool.end();
  }
}

function runScraper(job) {
  return new Promise((resolve, reject) => {
    const pythonPath =
      process.platform === "win32"
        ? path.join(__dirname, "venv", "Scripts", "python.exe")
        : "python";

    const trackPath = path.join(__dirname, "track.py");

    const python = spawn(pythonPath, [trackPath, job.card_code]);

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("Python:", data.toString());
    });

    python.on("error", (error) => {
      reject(error);
    });

    python.on("close", async (code) => {
      if (code !== 0) {
        console.error(`Scraper failed for job ${job.id}`);

        await saveFailure(job.id, errorOutput || "Python scraper failed");

        return resolve();
      }

      try {
        const prices = JSON.parse(output.trim());

        console.log(`Scraper result for job ${job.id}:`, prices);

        for (const item of prices) {
          await pool.query(
            `
                        INSERT INTO price_history
                        (
                            tracking_job_id,
                            option,
                            price,
                            status,
                            error_message
                        )
                        VALUES ($1, $2, $3, $4, $5)
                        `,
            [
              job.id,
              item.option,
              item.price === "N/A" ? null : item.price,
              item.price === "N/A" ? "failed" : "success",
              item.price === "N/A" ? "Price not available" : null,
            ],
          );
        }

        await pool.query(
          `
                    UPDATE tracking_jobs
                    SET last_tracked_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    `,
          [job.id],
        );

        console.log(`Job ${job.id} saved successfully`);

        resolve();
      } catch (error) {
        console.error(`JSON error for job ${job.id}:`, error);

        await saveFailure(job.id, error.message);

        resolve();
      }
    });
  });
}

async function saveFailure(jobId, errorMessage) {
  await pool.query(
    `
        INSERT INTO price_history
        (
            tracking_job_id,
            status,
            error_message
        )
        VALUES ($1, $2, $3)
        `,
    [jobId, "failed", errorMessage],
  );
}

main();

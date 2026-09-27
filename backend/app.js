const pool = require("./db/db");
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const app = express();
// const { Pool } = require("pg");

app.use(cors());
app.use(express.json());



app.patch("/api/tracked-products/:id/toggle", async (req, res) => {

  const trackingJobId = req.params.id;

  try {

    const result = await pool.query(
      `
      UPDATE tracking_jobs
      SET tracking_active = NOT tracking_active
      WHERE id = $1
      RETURNING *
      `,
      [trackingJobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Tracking job not found"
      });
    }

    const job = result.rows[0];

    console.log(
      "Tracking status changed:",
      job.id,
      job.tracking_active
    );

    res.json({
      success: true,
      message: job.tracking_active
        ? "Tracking started"
        : "Tracking paused",
      tracking_active: job.tracking_active,
      job: job
    });

  } catch (error) {

    console.error(
      "Toggle tracking error:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Failed to change tracking status"
    });

  }
});







// app.post("/api/track", (req, res) => {

//     const card_code = req.body.card_code;

//     console.log("Track:", card_code);

//     const pythonPath = path.join(
//         __dirname,
//         "venv",
//         "Scripts",
//         "python.exe"
//     );

//     const trackPath = path.join(
//         __dirname,
//         "track.py"
//     );

//     const python = spawn(
//         pythonPath,
//         [trackPath, card_code]
//     );

//     let output = "";

//     python.stdout.on("data", (data) => {
//         output += data.toString();
//     });
//     console.log(output)
//     python.stderr.on("data", (data) => {
//         console.log("Python:", data.toString());
//     });

//     python.on("error", (error) => {
//         console.error("Python spawn error:", error);

//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     });

//     python.on("close", (code) => {

//         if (code !== 0) {
//             return res.status(500).json({
//                 success: false,
//                 error: "Tracking failed"
//             });
//         }

//         try {
//             const result = JSON.parse(output);
//             res.json(result);

//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 error: "Invalid Python output",
//                 output: output
//             });
//         }
//     });
// });

app.post("/api/track", async (req, res) => {
  const { card_code, product_name, product_url, option } = req.body;

  console.log("Track request:", req.body);

  if (!card_code) {
    return res.status(400).json({
      success: false,
      error: "card_code is required",
    });
  }

  try {
    // ==========================================
    // 1. STORE TRACKING JOB
    // ==========================================

    const jobResult = await pool.query(
      `
            INSERT INTO tracking_jobs
            (
                card_code,
                product_name,
                product_url,
                option,
                tracking_active
            )
            VALUES ($1, $2, $3, $4, TRUE)
            RETURNING *
            `,
      [card_code, product_name, product_url, option],
    );

    const job = jobResult.rows[0];

    console.log("Tracking job created:", job.id);

    // ==========================================
    // 2. RUN PYTHON SCRAPER
    // ==========================================

    const pythonPath = path.join(__dirname, "venv", "Scripts", "python.exe");

    const trackPath = path.join(__dirname, "track.py");

    const python = spawn(pythonPath, [trackPath, card_code]);

    let output = "";

    python.stdout.on("data", (data) => {
      const text = data.toString();

      output += text;

      console.log("Python:", text);
    });

    python.stderr.on("data", (data) => {
      console.error("Python:", data.toString());
    });

    python.on("error", async (error) => {
      console.error("Python spawn error:", error);

      for (const item of result) {
        await pool.query(
          `
        INSERT INTO price_history
        (
            tracking_job_id,
            price,
            status,
            error_message
        )
        VALUES ($1, $2, $3, $4)
        `,
          [
            job.id,
            item.price === "N/A" ? null : item.price,
            item.price === "N/A" ? "failed" : "success",
            item.price === "N/A" ? "Price not available" : null,
          ],
        );
      }
    });

    python.on("close", async (code) => {
      console.log("Python exited:", code);

      // ======================================
      // SCRAPER FAILED
      // ======================================

      if (code !== 0) {
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
          [job.id, "failed", "Python scraper failed"],
        );

        return;
      }

      // ======================================
      // PARSE PYTHON RESULT
      // ======================================

      try {
        const result = JSON.parse(output.trim());

        console.log("Scraper result:", result);

        // ==================================
        // SAVE PRICE
        // ==================================

        // ==================================
        // SAVE OPTIONS + PRICES
        // ==================================

        for (const item of result) {
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

        console.log("All options and prices saved successfully");

        // ==================================
        // UPDATE LAST TRACKED
        // ==================================

        await pool.query(
          `
                    UPDATE tracking_jobs
                    SET last_tracked_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    `,
          [job.id],
        );

        console.log("Price saved successfully");
      } catch (error) {
        console.error("JSON / DB error:", error);

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
          [job.id, "failed", error.message],
        );
      }
    });

    // ==========================================
    // 3. IMMEDIATELY RESPOND TO REACT
    // ==========================================

    res.json({
      success: true,
      message: "Price tracking started",

      job: {
        id: job.id,
        card_code: job.card_code,
        product_name: job.product_name,
        option: job.option,
        tracking_active: job.tracking_active,
      },
    });
  } catch (error) {
    console.error("Track API error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/tracked-products", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                tj.id AS tracking_job_id,
                tj.card_code,
                tj.product_name,
                tj.product_url,
                tj.tracking_active,

                ph.id AS price_history_id,
                ph.option,
                ph.price,
                ph.status,
                ph.error_message,
                ph.tracked_at

            FROM tracking_jobs tj

            LEFT JOIN price_history ph
                ON tj.id = ph.tracking_job_id

            WHERE tj.tracking_active = TRUE

            ORDER BY tj.id DESC, ph.tracked_at DESC
        `);

    const products = {};

    for (const row of result.rows) {
      if (!products[row.tracking_job_id]) {
        products[row.tracking_job_id] = {
          tracking_job_id: row.tracking_job_id,
          card_code: row.card_code,
          product_name: row.product_name,
          product_url: row.product_url,
          tracking_active: row.tracking_active,
          prices: [],
        };
      }

      if (row.price_history_id) {
        products[row.tracking_job_id].prices.push({
          option: row.option,
          price: row.price,
          status: row.status,
          error_message: row.error_message,
          tracked_at: row.tracked_at,
        });
      }
    }

    res.json(Object.values(products));
  } catch (error) {
    console.error("Tracked products error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch tracked products",
    });
  }
});
app.delete("/api/tracked-products/:id", async (req, res) => {
  const trackingJobId = req.params.id;

  try {
    const result = await pool.query(
      `
            DELETE FROM tracking_jobs
            WHERE id = $1
            RETURNING *
            `,
      [trackingJobId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Tracking job not found",
      });
    }

    console.log("Tracking job deleted:", trackingJobId);

    res.json({
      success: true,
      message: "Tracking stopped",
      job: result.rows[0],
    });
  } catch (error) {
    console.error("Stop tracking error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to stop tracking",
    });
  }
});

app.post("/api", (req, res) => {
  const search = req.body.search;
  console.log("Search from React:", search);
  const pythonPath = path.join(__dirname, "venv", "Scripts", "python.exe");
  const scraperPath = path.join(__dirname, "scraper.py");
  const python = spawn(pythonPath, [scraperPath, search]);
  let output = "";
  python.stdout.on("data", (data) => {
    output += data.toString();
  });
  python.stderr.on("data", (data) => {
    console.error("Python error:", data.toString());
  });
  python.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: "Python scraper failed",
      });
    }
    try {
      const result = JSON.parse(output);
      res.json(result);
    } catch (error) {
      console.error("JSON parse error:", error);
      console.error("Python output:", output);
      res.status(500).json({
        error: "Invalid response from Python",
      });
    }
  });
});

app.listen(4000, () => {
  console.log("Server listening on port 4000");
});

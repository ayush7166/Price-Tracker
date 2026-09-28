require("dotenv").config();

const pool = require("./db/db");
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const app = express();
// const { Pool } = require("pg");


// const allowedOrigins = [
//     process.env.FRONTEND_URL,
//     process.env.FRONTEND_PREVIEW_URL
// ];
// origin: function (origin, callback) {
//         if (!origin || allowedOrigins.includes(origin)) {
//             callback(null, true);
//         } else {
//             callback(new Error("Not allowed by CORS"));
//         }
//     }
app.use(cors({
}));
app.use(express.json());

const PORT = process.env.PORT || 10000;
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
      [trackingJobId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Tracking job not found",
      });
    }

    const job = result.rows[0];

    console.log("Tracking status changed:", job.id, job.tracking_active);

    res.json({
      success: true,
      message: job.tracking_active ? "Tracking started" : "Tracking paused",
      tracking_active: job.tracking_active,
      job: job,
    });
  } catch (error) {
    console.error("Toggle tracking error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to change tracking status",
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
  const {
    card_code,
    product_name,
    product_brand,
    product_dept
  } = req.body;

  console.log("Track request:", req.body);

  if (!card_code) {
    return res.status(400).json({
      success: false,
      error: "card_code is required",
    });
  }

  try {
    const pythonPath =
      process.platform === "win32"
      ? path.join(__dirname, "venv", "Scripts", "python.exe")
      : "/opt/venv/bin/python";

    const trackPath = path.join(__dirname, "track.py");

    const python = spawn(pythonPath, [trackPath, card_code]);

    let output = "";

    // ======================================
    // PYTHON OUTPUT
    // ======================================

    python.stdout.on("data", (data) => {
      const text = data.toString();

      output += text;

      console.log("Python:", text);
    });

    python.stderr.on("data", (data) => {
      console.error("Python:", data.toString());
    });

    // ======================================
    // PYTHON SPAWN ERROR
    // ======================================

    python.on("error", (error) => {
      console.error("Python spawn error:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // ======================================
    // PYTHON FINISHED
    // ======================================

    python.on("close", async (code) => {
      console.log("Python exited:", code);

      // ======================================
      // SCRAPER FAILED
      // ======================================

      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: "Python scraper failed",
        });
      }

      try {
        // ======================================
        // PARSE PYTHON JSON
        // ======================================

        const result = JSON.parse(output);

        console.log("Scraper result:", result);

        if (!Array.isArray(result)) {
          return res.status(500).json({
            success: false,
            error: "Invalid scraper result",
          });
        }

        // ======================================
        // CREATE TRACKING JOB
        // ======================================

        const productUrl =
          `https://demo.inelabteamdev.com/item/${card_code}`;

        const jobResult = await pool.query(
          `
          INSERT INTO tracking_jobs
          (
            card_code,
            product_name,
            option,
            tracking_active,
            product_url,
            brand,
            dept_label,
            created_at,
            last_tracked_at
          )
          VALUES
          (
            $1,
            $2,
            NULL,
            TRUE,
            $3,
            $4,
            $5,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          RETURNING *
          `,
          [
            String(card_code),
            product_name || "",
            productUrl,
            product_brand || "",
            product_dept || "",
          ]
        );

        const job = jobResult.rows[0];

        console.log("Tracking job created:", job);

        // ======================================
        // SAVE PRICE HISTORY
        // ======================================

        for (const item of result) {

          let price = null;

          if (
            item.price &&
            item.price !== "N/A" &&
            item.price !== "--"
          ) {
            const cleanedPrice = String(item.price)
              .replace(/[₹,\s]/g, "");

            const numericPrice = Number(cleanedPrice);

            if (!Number.isNaN(numericPrice)) {
              price = numericPrice;
            }
          }

          const status =
            price !== null
              ? "success"
              : "failed";

          const errorMessage =
            price !== null
              ? null
              : "Price not available";

          await pool.query(
            `
            INSERT INTO price_history
            (
              tracking_job_id,
              option,
              price,
              status,
              error_message,
              tracked_at
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              CURRENT_TIMESTAMP
            )
            `,
            [
              job.id,
              item.option || "",
              price,
              status,
              errorMessage,
            ]
          );
        }

        console.log(
          "All options and prices saved successfully"
        );

        // ======================================
        // RESPONSE TO REACT
        // ======================================

        return res.json({
          success: true,
          message: "Price tracking started",

          job: {
            id: job.id,
            card_code: job.card_code,
            product_name: job.product_name,
            product_url: job.product_url,
            brand: job.brand,
            dept_label: job.dept_label,
            tracking_active: job.tracking_active,
            created_at: job.created_at,
            last_tracked_at: job.last_tracked_at,
          },

          prices: result,
        });

      } catch (error) {

        console.error("JSON / DB error:", error);

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

  } catch (error) {

    console.error("Track API error:", error);

    return res.status(500).json({
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
        tj.brand,
        tj.dept_label,
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

      ORDER BY
        tj.id DESC,
        ph.tracked_at DESC
    `);

    const products = {};

    for (const row of result.rows) {

      if (!products[row.tracking_job_id]) {
        products[row.tracking_job_id] = {
          tracking_job_id: row.tracking_job_id,
          card_code: row.card_code,
          product_name: row.product_name,
          product_url: row.product_url,
          brand: row.brand,
          dept_label: row.dept_label,
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
console.log("TRACKED PRODUCTS API:", JSON.stringify(Object.values(products), null, 2));
   res.json({
  success: true,
  data: Object.values(products)
});

  } catch (error) {
    console.error("Tracked products error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
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
  const pythonPath =
    process.platform === "win32"
      ? path.join(__dirname, "venv", "Scripts", "python.exe")
      : "python";
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

app.post("/api/run-worker", (req, res) => {
  const secret = req.headers.authorization;

  if (secret !== `Bearer ${process.env.WORKER_SECRET}`) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  const workerPath = path.join(__dirname, "worker.js");

  const worker = spawn("node", [workerPath]);

  worker.stdout.on("data", (data) => {
    console.log("Worker:", data.toString());
  });

  worker.stderr.on("data", (data) => {
    console.error("Worker error:", data.toString());
  });

  worker.on("error", (error) => {
    console.error("Worker spawn error:", error);
  });

  worker.on("close", (code) => {
    console.log("Worker exited with code:", code);
  });

  res.json({
    success: true,
    message: "Worker started",
  });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});

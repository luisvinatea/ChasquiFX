import {
  getForexRates,
  getForexStatus,
} from "../../src/controllers/forex-mongodb.js";
import { connectToDatabase } from "../../src/db/mongodb-vercel.js";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Test database connection first
  try {
    await connectToDatabase();

    // Handle different endpoints
    if (req.method === "GET") {
      if (req.query.rates !== undefined) {
        return await getForexRates(req, res);
      } else {
        return await getForexStatus(req, res);
      }
    }

    // Method not allowed
    return res.status(405).json({
      status: "error",
      message: "Method not allowed",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: `Server error: ${error.message}`,
    });
  }
}

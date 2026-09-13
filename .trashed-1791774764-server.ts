/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import AdmZip from "adm-zip";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Ensure directories exist
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration for screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".png";
    cb(null, "screenshot-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

// JSON fallback file for database
const FALLBACK_DB_FILE = path.join(process.cwd(), "db_fallback.json");

// Define initial fallback structure
const initialFallbackData = {
  settings: [
    { key_name: "upi_id", key_value: "keralalotteries@ybl" },
    { key_name: "qr_code_image", key_value: "" },
    { key_name: "admin_passcode", key_value: "admin123" },
    { key_name: "contact_number", key_value: "+91 94460 01234" },
    { key_name: "contact_email", key_value: "contact@keralalottery.com" },
    { key_name: "whatsapp_number", key_value: "+91 94460 01234" }
  ],
  tickets: [] as any[]
};

// Sync functions for JSON fallback DB
function readFallbackDB() {
  try {
    if (!fs.existsSync(FALLBACK_DB_FILE)) {
      fs.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(initialFallbackData, null, 2));
      return initialFallbackData;
    }
    const content = fs.readFileSync(FALLBACK_DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading JSON fallback DB, resetting to default:", err);
    return initialFallbackData;
  }
}

function writeFallbackDB(data: any) {
  try {
    fs.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing JSON fallback DB:", err);
  }
}

// Global DB Connection pool state
let dbPool: mysql.Pool | null = null;
let isUsingFallbackDB = false;

// Initialize Database connection
async function initDatabase() {
  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER || "u194092554_kkyy";
  const password = process.env.DB_PASSWORD || "t2C!#4RRs|";
  const database = process.env.DB_NAME || "u194092554_kkyy";
  const port = parseInt(process.env.DB_PORT || "3306", 10);

  console.log(`Connecting to MySQL database at ${host}:${port} with user ${user}...`);
  try {
    dbPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4000 // 4 seconds timeout
    });

    // Test the connection
    const connection = await dbPool.getConnection();
    console.log("MySQL Database connected successfully on " + host + "!");
    connection.release();

    // Set up tables if they don't exist
    await runDbMigrations();
    isUsingFallbackDB = false;
  } catch (error: any) {
    console.log("Notice: Local or remote MySQL database could not be reached. Activating secure JSON flat-file storage service.");
    dbPool = null;
    isUsingFallbackDB = true;
    readFallbackDB();
  }
}

// Running basic table bootstrap migration script
async function runDbMigrations() {
  if (!dbPool) return;
  const connection = await dbPool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(50) UNIQUE NOT NULL,
        key_value TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(150),
        state VARCHAR(100) NOT NULL,
        package_name VARCHAR(150) NOT NULL,
        ticket_count INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        screenshot_path VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        ticket_number VARCHAR(255) DEFAULT '',
        winning_prize VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert original default records if missing
    const [rows]: any = await connection.query("SELECT COUNT(*) as count FROM settings");
    if (rows[0].count === 0) {
      await connection.query(`
        INSERT INTO settings (key_name, key_value) VALUES 
        ('upi_id', 'keralalotteries@ybl'),
        ('qr_code_image', ''),
        ('admin_passcode', 'admin123'),
        ('contact_number', '+91 94460 01234'),
        ('contact_email', 'contact@keralalottery.com'),
        ('whatsapp_number', '+91 94460 01234')
      `);
    } else {
      // Safely insert new columns/rows if the table already existed but didn't have contact variables
      await connection.query(`
        INSERT IGNORE INTO settings (key_name, key_value) VALUES 
        ('contact_number', '+91 94460 01234'),
        ('contact_email', 'contact@keralalottery.com'),
        ('whatsapp_number', '+91 94460 01234')
      `);
    }
  } catch (err) {
    console.error("Database schema migrations failed:", err);
  } finally {
    connection.release();
  }
}

// Database helper queries with transparent fallbacks
async function getSettingValue(key: string): Promise<string> {
  const defaultAdminCode = process.env.ADMIN_PASSCODE || "admin123";
  if (isUsingFallbackDB || !dbPool) {
    const data = readFallbackDB();
    if (key === "admin_passcode") {
      const match = data.settings.find((s: any) => s.key_name === "admin_passcode");
      return match ? match.key_value : defaultAdminCode;
    }
    const match = data.settings.find((s: any) => s.key_name === key);
    return match ? match.key_value : "";
  }

  try {
    const [rows]: any = await dbPool.query("SELECT key_value FROM settings WHERE key_name = ?", [key]);
    if (rows.length > 0) {
      return rows[0].key_value;
    }
    if (key === "admin_passcode") return defaultAdminCode;
    return "";
  } catch (err) {
    console.error(`Error querying settings for ${key}:`, err);
    return "";
  }
}

async function setSettingValue(key: string, value: string): Promise<void> {
  if (isUsingFallbackDB || !dbPool) {
    const data = readFallbackDB();
    const idx = data.settings.findIndex((s: any) => s.key_name === key);
    if (idx >= 0) {
      data.settings[idx].key_value = value;
    } else {
      data.settings.push({ key_name: key, key_value: value });
    }
    writeFallbackDB(data);
    return;
  }

  try {
    await dbPool.query(
      "INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = ?",
      [key, value, value]
    );
  } catch (err) {
    console.error(`Error updating setting ${key}:`, err);
    throw err;
  }
}

// General Express body parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Expose public directories
app.use("/uploads", express.static(UPLOADS_DIR));

// ----------------------------------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------------------------------

// Check environment & system database status
app.get("/api/status", async (req, res) => {
  res.json({
    activeDB: isUsingFallbackDB ? "Fallback Flat-File JSON Database" : "Production Live MySQL Database",
    isUsingFallbackDB,
    uploadsCount: fs.readdirSync(UPLOADS_DIR).length
  });
});

// Fetch current UPI checkout details
app.get("/api/settings", async (req, res) => {
  try {
    const upiId = await getSettingValue("upi_id");
    const qrCodeImage = await getSettingValue("qr_code_image");
    const contactNumber = await getSettingValue("contact_number");
    const contactEmail = await getSettingValue("contact_email");
    const whatsappNumber = await getSettingValue("whatsapp_number");
    
    res.json({
      upiId: upiId || "keralalotteries@ybl",
      qrCodeImage: qrCodeImage || "",
      contactNumber: contactNumber || "+91 94460 01234",
      contactEmail: contactEmail || "contact@keralalottery.com",
      whatsappNumber: whatsappNumber || "+91 94460 01234"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load settings." });
  }
});

// Update settings (Admin only, checked via passcode directly or Authorization header)
app.post("/api/settings", async (req, res) => {
  const { upiId, qrCodeImage, contactNumber, contactEmail, whatsappNumber, passcode } = req.body;
  
  if (!passcode) {
    return res.status(401).json({ error: "Administration code is required." });
  }

  const savedPasscode = await getSettingValue("admin_passcode");
  if (passcode !== savedPasscode) {
    return res.status(403).json({ error: "Invalid administration passcode." });
  }

  try {
    if (upiId !== undefined) {
      await setSettingValue("upi_id", upiId);
    }
    if (qrCodeImage !== undefined) {
      await setSettingValue("qr_code_image", qrCodeImage);
    }
    if (contactNumber !== undefined) {
      await setSettingValue("contact_number", contactNumber);
    }
    if (contactEmail !== undefined) {
      await setSettingValue("contact_email", contactEmail);
    }
    if (whatsappNumber !== undefined) {
      await setSettingValue("whatsapp_number", whatsappNumber);
    }
    res.json({ success: true, message: "Administration parameters successfully updated!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update administration parameters." });
  }
});

// Admin Passcode Update API
app.post("/api/settings/passcode", async (req, res) => {
  const { currentPasscode, newPasscode } = req.body;
  if (!currentPasscode || !newPasscode) {
    return res.status(400).json({ error: "Current passcode and new passcode are required." });
  }

  const savedPasscode = await getSettingValue("admin_passcode");
  if (currentPasscode !== savedPasscode) {
    return res.status(403).json({ error: "Invalid visual administrative passcode." });
  }

  try {
    await setSettingValue("admin_passcode", newPasscode);
    res.json({ success: true, message: "Passcode successfully changed!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update security credentials." });
  }
});

// Alphanumeric Government Slip Ticket Serial generator
function generateKeralaTicketNumbers(count: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const tickets: string[] = [];
  for (let i = 0; i < count; i++) {
    // Alphanumeric Series e.g. KB, MR, TS, AC
    const series = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
    const number = Math.floor(100000 + Math.random() * 900000); // 6-digit lottery number
    tickets.push(`${series}-${number}`);
  }
  return tickets.join(", ");
}

// Buy Ticket Endpoint (Form submission & screenshot upload)
app.post("/api/buy", upload.single("screenshot"), async (req, res) => {
  try {
    const { name, phone, email, state, packageName, ticketCount, amount } = req.body;
    
    if (!name || !phone || !state || !packageName || !ticketCount || !amount) {
      return res.status(400).json({ error: "Required fields are missing. Please enter name, phone, state and package options." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Payment verification screenshot is required. Please upload files." });
    }

    const screenshotFilename = "/uploads/" + req.file.filename;
    const finalTicketCount = parseInt(ticketCount, 10) || 1;
    const autoTicketNumbers = generateKeralaTicketNumbers(finalTicketCount);

    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const newTicket = {
        id: Date.now() + Math.round(Math.random() * 1000),
        name,
        phone,
        email: email || "",
        state,
        packageName,
        ticketCount: finalTicketCount,
        amount: parseFloat(amount),
        screenshotPath: screenshotFilename,
        status: "pending",
        ticketNumber: autoTicketNumbers,
        winningPrize: "Result Pending",
        createdAt: new Date().toISOString()
      };
      data.tickets.unshift(newTicket);
      writeFallbackDB(data);

      return res.json({
        success: true,
        message: "Your purchase inquiry is successfully submitted! Admin will verify and award tickets shortly.",
        ticket: newTicket
      });
    }

    const [result]: any = await dbPool.query(
      `INSERT INTO tickets (name, phone, email, state, package_name, ticket_count, amount, screenshot_path, status, ticket_number, winning_prize)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'Result Pending')`,
      [name, phone, email || "", state, packageName, finalTicketCount, parseFloat(amount), screenshotFilename, autoTicketNumbers]
    );

    res.json({
      success: true,
      message: "Your purchase inquiry is successfully submitted! Admin will verify and award tickets shortly.",
      ticketId: result.insertId,
      ticketNumber: autoTicketNumbers
    });

  } catch (error: any) {
    console.error("Booking submission failure:", error);
    res.status(500).json({ error: error?.message || "Internal booking mechanism issue." });
  }
});

// Result verification endpoint (Look up by phone number)
app.get("/api/results", async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Phone number parameter is required." });
  }

  try {
    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const results = data.tickets.filter((t: any) => t.phone.trim() === String(phone).trim());
      return res.json(results);
    }

    const [rows]: any = await dbPool.query(
      "SELECT id, name, phone, email, state, package_name as packageName, ticket_count as ticketCount, amount, screenshot_path as screenshotPath, status, ticket_number as ticketNumber, winning_prize as winningPrize, created_at as createdAt FROM tickets WHERE phone = ? ORDER BY id DESC",
      [phone]
    );
    res.json(rows);
  } catch (error) {
    console.error("Result querying error:", error);
    res.status(500).json({ error: "Failed to fetch drawing results." });
  }
});

// Helper functions for masking private data in the public winning board
function maskName(name: string): string {
  if (!name) return "Winner";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0][0] + "***";
  }
  return parts[0] + " " + parts[1][0] + ".";
}

function maskPhone(phone: string): string {
  const cleaned = phone.trim();
  if (cleaned.length < 4) return "****";
  return "****" + cleaned.slice(-4);
}

// Public winning board records endpoint
app.get("/api/winners", async (req, res) => {
  try {
    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const winners = data.tickets
        .filter((t: any) => t.status === "verified" && t.winningPrize && t.winningPrize !== "Result Pending" && t.winningPrize !== "None")
        .map((t: any) => ({
          id: t.id,
          name: maskName(t.name),
          phone: maskPhone(t.phone),
          state: t.state,
          packageName: t.packageName,
          ticketNumber: t.ticketNumber,
          winningPrize: t.winningPrize,
          createdAt: t.createdAt
        }));
      return res.json(winners);
    }

    const [rows]: any = await dbPool.query(
      `SELECT id, name, phone, state, package_name as packageName, ticket_number as ticketNumber, winning_prize as winningPrize, created_at as createdAt 
       FROM tickets 
       WHERE status = 'verified' AND winning_prize != '' AND winning_prize != 'Result Pending' AND winning_prize != 'None' 
       ORDER BY id DESC`
    );

    const winners = rows.map((t: any) => ({
      id: t.id,
      name: maskName(t.name),
      phone: maskPhone(t.phone),
      state: t.state,
      packageName: t.packageName,
      ticketNumber: t.ticketNumber,
      winningPrize: t.winningPrize,
      createdAt: t.createdAt
    }));
    res.json(winners);
  } catch (error) {
    console.error("Failed to query public winners board:", error);
    res.status(500).json({ error: "Failed to load public winning board." });
  }
});

// Admin panel login check
app.post("/api/admin/login", async (req, res) => {
  const { passcode } = req.body;
  if (!passcode) {
    return res.status(400).json({ error: "Passcode required." });
  }

  try {
    const savedPasscode = await getSettingValue("admin_passcode");
    if (passcode === savedPasscode) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ error: "Incorrect passcode." });
    }
  } catch (error) {
    res.status(500).json({ error: "Server authentication check failure." });
  }
});

// Admin - get all bookings/tickets
app.get("/api/admin/bookings", async (req, res) => {
  const { passcode } = req.query;
  if (!passcode) {
    return res.status(401).json({ error: "Passcode is required for booking queries." });
  }

  const savedPasscode = await getSettingValue("admin_passcode");
  if (String(passcode) !== savedPasscode) {
    return res.status(403).json({ error: "Access denied: Invalid passcode." });
  }

  try {
    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      return res.json(data.tickets);
    }

    const [rows]: any = await dbPool.query(
      "SELECT id, name, phone, email, state, package_name as packageName, ticket_count as ticketCount, amount, screenshot_path as screenshotPath, status, ticket_number as ticketNumber, winning_prize as winningPrize, created_at as createdAt FROM tickets ORDER BY id DESC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard booking list." });
  }
});

// Admin - verify purchase ticket and award lucky ticket numbers & prize values
app.post("/api/admin/verify", async (req, res) => {
  const { bookingId, ticketNumber, winningPrize, passcode } = req.body;

  if (!passcode) {
    return res.status(401).json({ error: "Unauthenticated action." });
  }

  const savedPasscode = await getSettingValue("admin_passcode");
  if (passcode !== savedPasscode) {
    return res.status(403).json({ error: "Forbidden access." });
  }

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required." });
  }

  try {
    const finalTicketNum = ticketNumber ? String(ticketNumber).trim() : "Generated AB-102948";
    const finalPrize = winningPrize ? String(winningPrize).trim() : "Result Pending";

    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const idx = data.tickets.findIndex((t: any) => t.id === Number(bookingId));
      if (idx >= 0) {
        data.tickets[idx].status = "verified";
        data.tickets[idx].ticketNumber = finalTicketNum;
        data.tickets[idx].winningPrize = finalPrize;
        writeFallbackDB(data);
        return res.json({ success: true, message: "Purchase verified, lucky numbers issued!" });
      }
      return res.status(404).json({ error: "Booking target match not found." });
    }

    await dbPool.query(
      "UPDATE tickets SET status = 'verified', ticket_number = ?, winning_prize = ? WHERE id = ?",
      [finalTicketNum, finalPrize, Number(bookingId)]
    );

    res.json({ success: true, message: "Purchase verified, ticket numbers issued!" });
  } catch (error) {
    console.error("Verification processing failed:", error);
    res.status(500).json({ error: "Failed to verify current purchase record." });
  }
});

// Admin - reject purchase ticket
app.post("/api/admin/reject", async (req, res) => {
  const { bookingId, passcode } = req.body;

  if (!passcode) {
    return res.status(401).json({ error: "Unauthenticated action." });
  }

  const savedPasscode = await getSettingValue("admin_passcode");
  if (passcode !== savedPasscode) {
    return res.status(403).json({ error: "Forbidden access." });
  }

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required." });
  }

  try {
    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const idx = data.tickets.findIndex((t: any) => t.id === Number(bookingId));
      if (idx >= 0) {
        data.tickets[idx].status = "rejected";
        data.tickets[idx].ticketNumber = "N/A - Rejected";
        data.tickets[idx].winningPrize = "Failed Verification / Rejected";
        writeFallbackDB(data);
        return res.json({ success: true, message: "Purchase successfully marked as rejected." });
      }
      return res.status(404).json({ error: "Booking target match not found." });
    }

    await dbPool.query(
      "UPDATE tickets SET status = 'rejected', ticket_number = 'N/A - Rejected', winning_prize = 'Failed Verification / Rejected' WHERE id = ?",
      [Number(bookingId)]
    );

    res.json({ success: true, message: "Purchase successfully marked as rejected." });
  } catch (error) {
    res.status(500).json({ error: "Failed to complete reject transaction." });
  }
});

// Admin - delete ticket booking
app.post("/api/admin/delete", async (req, res) => {
  const { bookingId, passcode } = req.body;

  if (!passcode) {
    return res.status(401).json({ error: "Unauthenticated action." });
  }

  const savedPasscode = await getSettingValue("admin_passcode");
  if (passcode !== savedPasscode) {
    return res.status(403).json({ error: "Forbidden access." });
  }

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required." });
  }

  try {
    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const idx = data.tickets.findIndex((t: any) => t.id === Number(bookingId));
      if (idx >= 0) {
        const deletedTicket = data.tickets[idx];
        data.tickets.splice(idx, 1);
        writeFallbackDB(data);
        
        // delete screenshot file if it exists
        if (deletedTicket.screenshotPath) {
          const filePath = path.join(process.cwd(), deletedTicket.screenshotPath);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch(e) {}
          }
        }
        return res.json({ success: true, message: "Ticket booking deleted successfully." });
      }
      return res.status(404).json({ error: "Booking target match not found." });
    }

    // Fetch screenshot path to delete the file
    const [rows]: any = await dbPool.query("SELECT screenshot_path FROM tickets WHERE id = ?", [Number(bookingId)]);
    if (rows.length > 0 && rows[0].screenshot_path) {
      const filePath = path.join(process.cwd(), rows[0].screenshot_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch(e) {}
      }
    }

    await dbPool.query("DELETE FROM tickets WHERE id = ?", [Number(bookingId)]);
    res.json({ success: true, message: "Ticket booking deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete ticket record." });
  }
});

// Admin - manual ticket registration
app.post("/api/admin/add-manual", async (req, res) => {
  const { passcode, name, phone, email, state, packageName, ticketCount, amount, ticketNumber, winningPrize } = req.body;

  if (!passcode) {
    return res.status(401).json({ error: "Unauthenticated action." });
  }

  const savedPasscode = await getSettingValue("admin_passcode");
  if (passcode !== savedPasscode) {
    return res.status(403).json({ error: "Forbidden access." });
  }

  if (!name || !phone || !state) {
    return res.status(400).json({ error: "Name, Phone, and State are required." });
  }

  try {
    const finalTicketCount = parseInt(ticketCount, 10) || 1;
    const finalAmount = parseFloat(amount) || 0;
    const finalTicketNum = ticketNumber ? String(ticketNumber).trim() : generateKeralaTicketNumbers(finalTicketCount);
    const finalPrize = winningPrize ? String(winningPrize).trim() : "Result Pending";

    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const newManualTicket = {
        id: data.tickets.length > 0 ? Math.max(...data.tickets.map((t: any) => t.id)) + 1 : 1,
        name,
        phone,
        email: email || "",
        state,
        packageName: packageName || "Manual Offline Ticket",
        ticketCount: finalTicketCount,
        amount: finalAmount,
        screenshotPath: "/uploads/manual_entry.png",
        status: "verified" as const,
        ticketNumber: finalTicketNum,
        winningPrize: finalPrize,
        createdAt: new Date().toISOString()
      };
      data.tickets.unshift(newManualTicket);
      writeFallbackDB(data);
      return res.json({ success: true, message: "Manual ticket created successfully!" });
    }

    await dbPool.query(
      `INSERT INTO tickets (name, phone, email, state, package_name, ticket_count, amount, screenshot_path, status, ticket_number, winning_prize)
       VALUES (?, ?, ?, ?, ?, ?, ?, '/uploads/manual_entry.png', 'verified', ?, ?)`,
      [name, phone, email || "", state, packageName || "Manual Offline Ticket", finalTicketCount, finalAmount, finalTicketNum, finalPrize]
    );

    res.json({ success: true, message: "Manual ticket created successfully!" });
  } catch (error: any) {
    console.error("Failed to add manual ticket:", error);
    res.status(500).json({ error: "Failed to add manual ticket: " + error.message });
  }
});


// Export complete Source Code as ZIP bundle for local/Hostinger deployment
app.get("/api/admin/export-zip", async (req, res) => {
  const { passcode } = req.query;
  try {
    const savedPasscode = await getSettingValue("admin_passcode");
    if (!passcode || String(passcode) !== savedPasscode) {
      return res.status(403).json({ error: "Access denied: Unauthorized passcode." });
    }

    const zip = new AdmZip();
    const rootPath = process.cwd();

    // Helper to recursively traverse and append files
    const appendToZip = (currentDir: string, zipPrefix: string = "") => {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        // Exclude huge dependency folders, git repository, local database fallbacks, and local upload files
        if (
          item === "node_modules" ||
          item === ".git" ||
          item === "uploads" ||
          item === "db_fallback.json" ||
          item === "package-lock.json"
        ) {
          continue;
        }

        const fullPath = path.join(currentDir, item);
        const relPath = zipPrefix ? path.join(zipPrefix, item) : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          appendToZip(fullPath, relPath);
        } else {
          zip.addFile(relPath, fs.readFileSync(fullPath));
        }
      }
    };

    appendToZip(rootPath);

    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=kerala_lottery_portal_export.zip");
    res.send(buffer);
  } catch (err: any) {
    console.error("Failed to generate code export archive:", err);
    res.status(500).json({ error: "Failed to generate ZIP archive bundle: " + err.message });
  }
});

// Direct public download link for immediate integration
app.get("/api/direct-zip-download", async (req, res) => {
  try {
    const zip = new AdmZip();
    const rootPath = process.cwd();

    const appendToZip = (currentDir: string, zipPrefix: string = "") => {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        if (
          item === "node_modules" ||
          item === ".git" ||
          item === "uploads" ||
          item === "db_fallback.json" ||
          item === "package-lock.json"
        ) {
          continue;
        }

        const fullPath = path.join(currentDir, item);
        const relPath = zipPrefix ? path.join(zipPrefix, item) : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          appendToZip(fullPath, relPath);
        } else {
          zip.addFile(relPath, fs.readFileSync(fullPath));
        }
      }
    };

    appendToZip(rootPath);

    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=kerala_lottery_portal_export.zip");
    res.send(buffer);
  } catch (err: any) {
    console.error("Failed to generate direct code export archive:", err);
    res.status(500).json({ error: "Failed to generate direct ZIP archive bundle: " + err.message });
  }
});

// A public direct download link that does not require passcode for easy chat extraction
app.get("/api/download-export-zip", (req, res) => {
  try {
    const zip = new AdmZip();
    const rootPath = process.cwd();

    const appendToZip = (currentDir: string, zipPrefix: string = "") => {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        if (
          item === "node_modules" ||
          item === ".git" ||
          item === "uploads" ||
          item === "db_fallback.json" ||
          item === "package-lock.json"
        ) {
          continue;
        }

        const fullPath = path.join(currentDir, item);
        const relPath = zipPrefix ? path.join(zipPrefix, item) : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          appendToZip(fullPath, relPath);
        } else {
          zip.addFile(relPath, fs.readFileSync(fullPath));
        }
      }
    };

    appendToZip(rootPath);

    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=kerala_lottery_portal_export.zip");
    res.send(buffer);
  } catch (err: any) {
    console.error("Direct download zip generation failed:", err);
    res.status(500).json({ error: "Failed to generate download ZIP: " + err.message });
  }
});


// ----------------------------------------------------------------------------
// FULL STACK ROUTING HANDLING (VITE VS PROD)
// ----------------------------------------------------------------------------

async function startAppServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Express in development mode with active Vite routing...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Express in production mode serving compiled static bundles...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kerala State Lottery Portal serving on http://localhost:${PORT}`);
    console.log(`Port 3000 is open. Direct external accesses mapped naturally or ready.`);
  });
}

startAppServer().catch((err) => {
  console.error("CRITICAL error bootstapping Express App server entrypoint:", err);
});

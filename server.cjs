var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_adm_zip = __toESM(require("adm-zip"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var UPLOADS_DIR = import_path.default.join(process.cwd(), "uploads");
if (!import_fs.default.existsSync(UPLOADS_DIR)) {
  import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = import_path.default.extname(file.originalname) || ".png";
    cb(null, "screenshot-" + uniqueSuffix + ext);
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  }
});
var FALLBACK_DB_FILE = import_path.default.join(process.cwd(), "db_fallback.json");
var initialFallbackData = {
  settings: [
    { key_name: "upi_id", key_value: "keralalotteries@ybl" },
    { key_name: "qr_code_image", key_value: "" },
    { key_name: "admin_passcode", key_value: "admin123" },
    { key_name: "contact_number", key_value: "+91 94460 01234" },
    { key_name: "contact_email", key_value: "contact@keralalottery.com" },
    { key_name: "whatsapp_number", key_value: "+91 94460 01234" }
  ],
  tickets: []
};
function readFallbackDB() {
  try {
    if (!import_fs.default.existsSync(FALLBACK_DB_FILE)) {
      import_fs.default.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(initialFallbackData, null, 2));
      return initialFallbackData;
    }
    const content = import_fs.default.readFileSync(FALLBACK_DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading JSON fallback DB, resetting to default:", err);
    return initialFallbackData;
  }
}
function writeFallbackDB(data) {
  try {
    import_fs.default.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing JSON fallback DB:", err);
  }
}
var dbPool = null;
var isUsingFallbackDB = false;
async function initDatabase() {
  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER || "u194092554_kkyy";
  const password = process.env.DB_PASSWORD || "t2C!#4RRs|";
  const database = process.env.DB_NAME || "u194092554_kkyy";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  console.log(`Connecting to MySQL database at ${host}:${port} with user ${user}...`);
  try {
    dbPool = import_promise.default.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4e3
      // 4 seconds timeout
    });
    const connection = await dbPool.getConnection();
    console.log("MySQL Database connected successfully on " + host + "!");
    connection.release();
    await runDbMigrations();
    isUsingFallbackDB = false;
  } catch (error) {
    console.log("Notice: Local or remote MySQL database could not be reached. Activating secure JSON flat-file storage service.");
    dbPool = null;
    isUsingFallbackDB = true;
    readFallbackDB();
  }
}
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
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM settings");
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
async function getSettingValue(key) {
  const defaultAdminCode = process.env.ADMIN_PASSCODE || "admin123";
  if (isUsingFallbackDB || !dbPool) {
    const data = readFallbackDB();
    if (key === "admin_passcode") {
      const match2 = data.settings.find((s) => s.key_name === "admin_passcode");
      return match2 ? match2.key_value : defaultAdminCode;
    }
    const match = data.settings.find((s) => s.key_name === key);
    return match ? match.key_value : "";
  }
  try {
    const [rows] = await dbPool.query("SELECT key_value FROM settings WHERE key_name = ?", [key]);
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
async function setSettingValue(key, value) {
  if (isUsingFallbackDB || !dbPool) {
    const data = readFallbackDB();
    const idx = data.settings.findIndex((s) => s.key_name === key);
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
app.use(import_express.default.json({ limit: "15mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "15mb" }));
app.use("/uploads", import_express.default.static(UPLOADS_DIR));
app.get("/api/status", async (req, res) => {
  res.json({
    activeDB: isUsingFallbackDB ? "Fallback Flat-File JSON Database" : "Production Live MySQL Database",
    isUsingFallbackDB,
    uploadsCount: import_fs.default.readdirSync(UPLOADS_DIR).length
  });
});
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
    if (upiId !== void 0) {
      await setSettingValue("upi_id", upiId);
    }
    if (qrCodeImage !== void 0) {
      await setSettingValue("qr_code_image", qrCodeImage);
    }
    if (contactNumber !== void 0) {
      await setSettingValue("contact_number", contactNumber);
    }
    if (contactEmail !== void 0) {
      await setSettingValue("contact_email", contactEmail);
    }
    if (whatsappNumber !== void 0) {
      await setSettingValue("whatsapp_number", whatsappNumber);
    }
    res.json({ success: true, message: "Administration parameters successfully updated!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update administration parameters." });
  }
});
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
function generateKeralaTicketNumbers(count) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const tickets = [];
  for (let i = 0; i < count; i++) {
    const series = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
    const number = Math.floor(1e5 + Math.random() * 9e5);
    tickets.push(`${series}-${number}`);
  }
  return tickets.join(", ");
}
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
        id: Date.now() + Math.round(Math.random() * 1e3),
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      data.tickets.unshift(newTicket);
      writeFallbackDB(data);
      return res.json({
        success: true,
        message: "Your purchase inquiry is successfully submitted! Admin will verify and award tickets shortly.",
        ticket: newTicket
      });
    }
    const [result] = await dbPool.query(
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
  } catch (error) {
    console.error("Booking submission failure:", error);
    res.status(500).json({ error: error?.message || "Internal booking mechanism issue." });
  }
});
app.get("/api/results", async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Phone number parameter is required." });
  }
  try {
    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const results = data.tickets.filter((t) => t.phone.trim() === String(phone).trim());
      return res.json(results);
    }
    const [rows] = await dbPool.query(
      "SELECT id, name, phone, email, state, package_name as packageName, ticket_count as ticketCount, amount, screenshot_path as screenshotPath, status, ticket_number as ticketNumber, winning_prize as winningPrize, created_at as createdAt FROM tickets WHERE phone = ? ORDER BY id DESC",
      [phone]
    );
    res.json(rows);
  } catch (error) {
    console.error("Result querying error:", error);
    res.status(500).json({ error: "Failed to fetch drawing results." });
  }
});
function maskName(name) {
  if (!name) return "Winner";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0][0] + "***";
  }
  return parts[0] + " " + parts[1][0] + ".";
}
function maskPhone(phone) {
  const cleaned = phone.trim();
  if (cleaned.length < 4) return "****";
  return "****" + cleaned.slice(-4);
}
app.get("/api/winners", async (req, res) => {
  try {
    if (isUsingFallbackDB || !dbPool) {
      const data = readFallbackDB();
      const winners2 = data.tickets.filter((t) => t.status === "verified" && t.winningPrize && t.winningPrize !== "Result Pending" && t.winningPrize !== "None").map((t) => ({
        id: t.id,
        name: maskName(t.name),
        phone: maskPhone(t.phone),
        state: t.state,
        packageName: t.packageName,
        ticketNumber: t.ticketNumber,
        winningPrize: t.winningPrize,
        createdAt: t.createdAt
      }));
      return res.json(winners2);
    }
    const [rows] = await dbPool.query(
      `SELECT id, name, phone, state, package_name as packageName, ticket_number as ticketNumber, winning_prize as winningPrize, created_at as createdAt 
       FROM tickets 
       WHERE status = 'verified' AND winning_prize != '' AND winning_prize != 'Result Pending' AND winning_prize != 'None' 
       ORDER BY id DESC`
    );
    const winners = rows.map((t) => ({
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
    const [rows] = await dbPool.query(
      "SELECT id, name, phone, email, state, package_name as packageName, ticket_count as ticketCount, amount, screenshot_path as screenshotPath, status, ticket_number as ticketNumber, winning_prize as winningPrize, created_at as createdAt FROM tickets ORDER BY id DESC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard booking list." });
  }
});
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
      const idx = data.tickets.findIndex((t) => t.id === Number(bookingId));
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
      const idx = data.tickets.findIndex((t) => t.id === Number(bookingId));
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
      const idx = data.tickets.findIndex((t) => t.id === Number(bookingId));
      if (idx >= 0) {
        const deletedTicket = data.tickets[idx];
        data.tickets.splice(idx, 1);
        writeFallbackDB(data);
        if (deletedTicket.screenshotPath) {
          const filePath = import_path.default.join(process.cwd(), deletedTicket.screenshotPath);
          if (import_fs.default.existsSync(filePath)) {
            try {
              import_fs.default.unlinkSync(filePath);
            } catch (e) {
            }
          }
        }
        return res.json({ success: true, message: "Ticket booking deleted successfully." });
      }
      return res.status(404).json({ error: "Booking target match not found." });
    }
    const [rows] = await dbPool.query("SELECT screenshot_path FROM tickets WHERE id = ?", [Number(bookingId)]);
    if (rows.length > 0 && rows[0].screenshot_path) {
      const filePath = import_path.default.join(process.cwd(), rows[0].screenshot_path);
      if (import_fs.default.existsSync(filePath)) {
        try {
          import_fs.default.unlinkSync(filePath);
        } catch (e) {
        }
      }
    }
    await dbPool.query("DELETE FROM tickets WHERE id = ?", [Number(bookingId)]);
    res.json({ success: true, message: "Ticket booking deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete ticket record." });
  }
});
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
        id: data.tickets.length > 0 ? Math.max(...data.tickets.map((t) => t.id)) + 1 : 1,
        name,
        phone,
        email: email || "",
        state,
        packageName: packageName || "Manual Offline Ticket",
        ticketCount: finalTicketCount,
        amount: finalAmount,
        screenshotPath: "/uploads/manual_entry.png",
        status: "verified",
        ticketNumber: finalTicketNum,
        winningPrize: finalPrize,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
  } catch (error) {
    console.error("Failed to add manual ticket:", error);
    res.status(500).json({ error: "Failed to add manual ticket: " + error.message });
  }
});
app.get("/api/admin/export-zip", async (req, res) => {
  const { passcode } = req.query;
  try {
    const savedPasscode = await getSettingValue("admin_passcode");
    if (!passcode || String(passcode) !== savedPasscode) {
      return res.status(403).json({ error: "Access denied: Unauthorized passcode." });
    }
    const zip = new import_adm_zip.default();
    const rootPath = process.cwd();
    const appendToZip = (currentDir, zipPrefix = "") => {
      const items = import_fs.default.readdirSync(currentDir);
      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === "uploads" || item === "db_fallback.json" || item === "package-lock.json") {
          continue;
        }
        const fullPath = import_path.default.join(currentDir, item);
        const relPath = zipPrefix ? import_path.default.join(zipPrefix, item) : item;
        const stat = import_fs.default.statSync(fullPath);
        if (stat.isDirectory()) {
          appendToZip(fullPath, relPath);
        } else {
          zip.addFile(relPath, import_fs.default.readFileSync(fullPath));
        }
      }
    };
    appendToZip(rootPath);
    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=kerala_lottery_portal_export.zip");
    res.send(buffer);
  } catch (err) {
    console.error("Failed to generate code export archive:", err);
    res.status(500).json({ error: "Failed to generate ZIP archive bundle: " + err.message });
  }
});
app.get("/api/direct-zip-download", async (req, res) => {
  try {
    const zip = new import_adm_zip.default();
    const rootPath = process.cwd();
    const appendToZip = (currentDir, zipPrefix = "") => {
      const items = import_fs.default.readdirSync(currentDir);
      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === "uploads" || item === "db_fallback.json" || item === "package-lock.json") {
          continue;
        }
        const fullPath = import_path.default.join(currentDir, item);
        const relPath = zipPrefix ? import_path.default.join(zipPrefix, item) : item;
        const stat = import_fs.default.statSync(fullPath);
        if (stat.isDirectory()) {
          appendToZip(fullPath, relPath);
        } else {
          zip.addFile(relPath, import_fs.default.readFileSync(fullPath));
        }
      }
    };
    appendToZip(rootPath);
    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=kerala_lottery_portal_export.zip");
    res.send(buffer);
  } catch (err) {
    console.error("Failed to generate direct code export archive:", err);
    res.status(500).json({ error: "Failed to generate direct ZIP archive bundle: " + err.message });
  }
});
app.get("/api/download-export-zip", (req, res) => {
  try {
    const zip = new import_adm_zip.default();
    const rootPath = process.cwd();
    const appendToZip = (currentDir, zipPrefix = "") => {
      const items = import_fs.default.readdirSync(currentDir);
      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === "uploads" || item === "db_fallback.json" || item === "package-lock.json") {
          continue;
        }
        const fullPath = import_path.default.join(currentDir, item);
        const relPath = zipPrefix ? import_path.default.join(zipPrefix, item) : item;
        const stat = import_fs.default.statSync(fullPath);
        if (stat.isDirectory()) {
          appendToZip(fullPath, relPath);
        } else {
          zip.addFile(relPath, import_fs.default.readFileSync(fullPath));
        }
      }
    };
    appendToZip(rootPath);
    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=kerala_lottery_portal_export.zip");
    res.send(buffer);
  } catch (err) {
    console.error("Direct download zip generation failed:", err);
    res.status(500).json({ error: "Failed to generate download ZIP: " + err.message });
  }
});
async function startAppServer() {
  await initDatabase();
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Express in development mode with active Vite routing...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Express in production mode serving compiled static bundles...");
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
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
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");

const router = express.Router();

// --- Multer setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// --- GET all users ---
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "❌ Error fetching users", error: err.message });
  }
});

router.post(
  "/",
  upload.fields([
    { name: "profile_img", maxCount: 1 },
    { name: "aadhar_front_img", maxCount: 1 },
    { name: "aadhar_back_img", maxCount: 1 },
    { name: "pan_front_img", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        phone_number,
        email,
        aadhar_no,
        employer_name,
        pan_card_number,
        ifsc_code,
        bank_account_no,
        nominee_name,
        nominee_phone_no,
      } = req.body;

      if (!phone_number || !email) {
        return res.status(400).json({ message: "⚠️ phone_number and email are required" });
      }

      const profile_img = req.files["profile_img"] ? req.files["profile_img"][0].filename : null;
      const aadhar_front_img = req.files["aadhar_front_img"] ? req.files["aadhar_front_img"][0].filename : null;
      const aadhar_back_img = req.files["aadhar_back_img"] ? req.files["aadhar_back_img"][0].filename : null;
      const pan_front_img = req.files["pan_front_img"] ? req.files["pan_front_img"][0].filename : null;

      const sql = `
        INSERT INTO users (
          phone_number, email, profile_img, aadhar_no, employer_name,
          pan_card_number, ifsc_code, bank_account_no,
          nominee_name, nominee_phone_no,
          aadhar_front_img, aadhar_back_img, pan_front_img
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.query(sql, [
        phone_number, email, profile_img, aadhar_no, employer_name,
        pan_card_number, ifsc_code, bank_account_no,
        nominee_name, nominee_phone_no,
        aadhar_front_img, aadhar_back_img, pan_front_img,
      ]);

      res.status(201).json({ message: "✅ User created successfully" });
    } catch (err) {
      res.status(500).json({ message: "❌ Error creating user", error: err.message });
    }
  }
);

module.exports = router;


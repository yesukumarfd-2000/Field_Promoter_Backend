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

/**
 * STEP 1 - Create User (Tab 1: user_id, phone_number, email)
 */
router.post("/", async (req, res) => {
  try {
    const { user_id, phone_number, email } = req.body;

    if (!user_id || !phone_number || !email) {
      return res.status(400).json({ message: "⚠️ user_id, phone_number and email are required" });
    }

    const sql = `INSERT INTO users (id, phone_number, email) VALUES (?, ?, ?)`;
    await db.query(sql, [user_id, phone_number, email]);

    res.status(201).json({ message: "✅ step1 :Approve successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Approve failed", error: err.message });
  }
});

router.post("/:id/profile", upload.single("profile_img"), async (req, res) => {
  try {
    const userId = req.params.id;
    const profile_img = req.file ? req.file.filename : null;

    if (!profile_img) {
      return res.status(400).json({ message: "⚠️ Profile image is required" });
    }

    const sql = `UPDATE users SET profile_img = ? WHERE id = ?`;
    await db.query(sql, [profile_img, userId]);

    res.status(200).json({ message: "✅ Step2 complete: Profile image uploaded" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error in Step2", error: err.message });
  }
});

router.post("/:id/details", async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      aadhar_no,
      employer_name,
      pan_card_number,
      ifsc_code,
      bank_account_no,
      nominee_name,
      nominee_phone_no,
    } = req.body;

    const sql = `
      UPDATE users SET 
        aadhar_no = ?, employer_name = ?, pan_card_number = ?, 
        ifsc_code = ?, bank_account_no = ?, nominee_name = ?, nominee_phone_no = ?, 
        aadhar_front_img = ?, aadhar_back_img = ?, pan_front_img = ?
      WHERE id = ?
    `;

    await db.query(sql, [
      aadhar_no, employer_name, pan_card_number,
      ifsc_code, bank_account_no, nominee_name, nominee_phone_no,
      userId
    ]);

    res.status(200).json({ message: "✅ Step3 complete: Details updated" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error in Step3", error: err.message });
  }
});

router.post(
  "/:id/upload-docs",
  upload.fields([
    { name: "aadhar_front_img", maxCount: 1 },
    { name: "aadhar_back_img", maxCount: 1 },
    { name: "pan_front_img", maxCount: 1 },
  ]),
  (req, res) => {
    try {
      res.json({
        message: "Documents uploaded successfully",
        files: req.files
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users");

    const users = rows.map(user => ({
      ...user,
      profile_img: user.profile_img ? `${req.protocol}://${req.get("host")}/uploads/${user.profile_img}` : null,
      aadhar_front_img: user.aadhar_front_img ? `${req.protocol}://${req.get("host")}/uploads/${user.aadhar_front_img}` : null,
      aadhar_back_img: user.aadhar_back_img ? `${req.protocol}://${req.get("host")}/uploads/${user.aadhar_back_img}` : null,
      pan_front_img: user.pan_front_img ? `${req.protocol}://${req.get("host")}/uploads/${user.pan_front_img}` : null,
    }));

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "❌ Error fetching users", error: err.message });
  }
});

module.exports = router;

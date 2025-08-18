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

router.post("/", async (req, res) => {
  try {
    const { user_id, phone_number, email } = req.body;

    if (!user_id || !phone_number || !email) {
      return res.status(400).json({ message: "⚠️ user_id, phone_number and email are required" });
    }

    const sql = `INSERT INTO users (user_id, phone_number, email) VALUES (?, ?, ?)`;
    await db.query(sql, [user_id, phone_number, email]);
    res.status(201).json({
      message: "✅ step1 :Approve successfully",
      result: { user_id, phone_number, email }
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Approve failed", error: err.message });
  }
});


router.post("/profile/:user_id", upload.single("profile_img"), async (req, res) => {
  try {
    const userId = req.params.user_id;
    const profile_img = req.file ? req.file.filename : null;

    if (!profile_img) {
      return res.status(400).json({ message: "⚠️ Profile image is required" });
    }

    const sql = `UPDATE users SET profile_img = ? WHERE user_id = ?`;
    await db.query(sql, [profile_img, userId]);


    res.status(200).json({ message: "✅ Step2 complete: Profile image uploaded", result: { user_id: userId, profile_img } });
  } catch (err) {
    res.status(500).json({ message: "❌ Error in Step2", error: err.message });
  }
});

router.post("/details/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      aadhar_no,
      employer_name,
      pan_card_number,
      ifsc_code,
      bank_account_no,
      nominee_name,
      nominee_phone_no,
    } = req.body;

    // Validate required fields
    if (!aadhar_no || !pan_card_number || !bank_account_no) {
      return res.status(400).json({
        message: "⚠️ Missing required fields (aadhar_no, pan_card_number, bank_account_no)",
      });
    }

    const sql = `
      UPDATE users 
      SET 
        aadhar_no = ?, 
        employer_name = ?, 
        pan_card_number = ?, 
        ifsc_code = ?, 
        bank_account_no = ?, 
        nominee_name = ?, 
        nominee_phone_no = ?,
        updated_at = NOW()
      WHERE user_id = ?
    `;

    const [result] = await db.query(sql, [
      aadhar_no,
      employer_name,
      pan_card_number,
      ifsc_code,
      bank_account_no,
      nominee_name,
      nominee_phone_no,
      user_id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found or no change made." });
    }

    res.status(200).json({
      message: "✅ Step3 complete: Details updated", result: {
        user_id,
        aadhar_no,
        employer_name,
        pan_card_number,
        ifsc_code,
        bank_account_no,
        nominee_name,
        nominee_phone_no,
      },
    });
  } catch (err) {
    console.error("SQL Error in Step3:", err);
    res.status(500).json({ message: "❌ Error in Step3", error: err.message });
  }
});


router.post("/upload-docs/:user_id", upload.fields([
  { name: "aadhar_front_img", maxCount: 1 },
  { name: "aadhar_back_img", maxCount: 1 },
  { name: "pan_front_img", maxCount: 1 },
]),
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const aadhar_front_img = req.files["aadhar_front_img"]
        ? req.files["aadhar_front_img"][0].filename
        : null;
      const aadhar_back_img = req.files["aadhar_back_img"]
        ? req.files["aadhar_back_img"][0].filename
        : null;
      const pan_front_img = req.files["pan_front_img"]
        ? req.files["pan_front_img"][0].filename
        : null;

      if (!aadhar_front_img && !aadhar_back_img && !pan_front_img) {
        return res.status(400).json({ message: "⚠️ No documents uploaded" });
      }

      const sql = `
        UPDATE users 
        SET 
          aadhar_front_img = ?, 
          aadhar_back_img = ?, 
          pan_front_img = ?,
          updated_at = NOW()
        WHERE user_id = ?
      `;

      const [result] = await db.query(sql, [
        aadhar_front_img,
        aadhar_back_img,
        pan_front_img,
        user_id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: `❌ No user found with ID: ${user_id}` });
      }

      res.status(200).json({
        message: "✅ Step4 complete: Documents uploaded & saved",
        files: {
          aadhar_front_img,
          aadhar_back_img,
          pan_front_img,
        },
      });
    } catch (err) {
      console.error("SQL Error in Step4:", err);
      res.status(500).json({ message: "❌ Error in Step4", error: err.message });
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

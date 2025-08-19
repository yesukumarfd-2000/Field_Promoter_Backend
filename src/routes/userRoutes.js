const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

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
// --- Routes Here ---
// Admin creates user 
router.post("/admin", async (req, res) => {
  try {
    const { user_id, phone_number, email } = req.body;

    if (!user_id || !phone_number || !email) {
      return res.status(400).json({
        message: "⚠️ user_id, phone_number and email are required",
        status: "failed",
        status_code: 400,
      });
    }

    // Check if user already exists
    const [rows] = await db.query("SELECT user_id FROM users WHERE user_id = ?", [user_id]);
    if (rows.length > 0) {
      return res.status(409).json({
        message: `⚠️ Step1: User with user_id ${user_id} already exists`,
        status: "duplicate",
        status_code: 409,
      });
    }
     const status = "verify-pending";
    const status_code = 0;
      const sql = `
      INSERT INTO users 
      (user_id, phone_number, email, status, status_code, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    await db.query(sql, [user_id, phone_number, email, status, status_code]);

    res.status(201).json({
      message: "✅ Step0: Admin created the user successfully",
      status,
      status_code,
      result: { user_id, phone_number, email, status, status_code },
    });
  } catch (err) {
    res.status(500).json({
      message: "❌ Step1: Failed to create admin user",
      error: err.message,
    });
  }
});
// User verified here
router.post("/", async (req, res) => {
  try {
    const { user_id, phone_number, email } = req.body;

    if (!user_id || !phone_number || !email) {
      return res.status(400).json({ message: "⚠️ user_id, phone_number and email are required" });
    }

    const sql = `
      UPDATE users 
      SET phone_number = ?, email = ?, status = 'profile-img-pending', status_code = 1, approved_at = NOW() 
      WHERE user_id = ?
    `;
    const [result] = await db.query(sql, [phone_number, email, user_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `❌ Step2: No user found with user_id ${user_id}` });
    }

    res.status(200).json({
      message: "✅ Step1: User verified successfully (status = profile-img-pending, code=1)",
      status: "profile-img-pending",
      status_code: 1,
      result: { user_id, phone_number, email, status: "profile-img-pending", status_code: 1 },
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Step2: Failed to verify user", error: err.message });
  }
});

router.post("/profile/:user_id", upload.single("profile_img"), async (req, res) => {
  try {
    const userId = req.params.user_id;
    const profile_img = req.file ? req.file.filename : null;

    if (!profile_img) {
      return res.status(400).json({ message: "⚠️ Profile image is required" });
    }

    const sql = `UPDATE users 
                 SET profile_img = ?, status = 'details-pending', status_code = 2, updated_at = NOW() 
                 WHERE user_id = ?`;
    const [result] = await db.query(sql, [profile_img, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `❌ Step3: No user found with user_id ${userId}` });
    }

    res.status(200).json({
      message: "✅ Step2: Profile image uploaded successfully (status = details-pending, code=2)",
      status: "details-pending",
      status_code: 2,
      result: { user_id: userId, profile_img, status: "details-pending", status_code: 2 },
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Step3: Failed to upload profile image", error: err.message });
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

    if (!aadhar_no || !pan_card_number || !bank_account_no || !nominee_name || !nominee_phone_no) {
      return res.status(400).json({
        message: "⚠️ Missing required fields (aadhar_no, pan_card_number, bank_account_no, nominee_name, nominee_phone_no)",
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
        status = 'uploads-docs-pending',
        status_code = 3,
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
      return res.status(404).json({ message: `❌ Step4: No user found with user_id ${user_id}` });
    }

    res.status(200).json({
      message: "✅ Step3: User details updated successfully",
      status: "uploads-docs-pending",
      status_code: 3,
      result: { user_id, aadhar_no, pan_card_number, bank_account_no, status: "uploads-docs-pending", status_code: 3 },
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Step4: Failed to update user details", error: err.message });
  }
});

router.post("/upload-docs/:user_id",upload.fields([
    { name: "aadhar_front_img", maxCount: 1 },
    { name: "aadhar_back_img", maxCount: 1 },
    { name: "pan_front_img", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const aadhar_front_img = req.files["aadhar_front_img"] ? req.files["aadhar_front_img"][0].filename : null;
      const aadhar_back_img = req.files["aadhar_back_img"] ? req.files["aadhar_back_img"][0].filename : null;
      const pan_front_img = req.files["pan_front_img"] ? req.files["pan_front_img"][0].filename : null;

      if (!aadhar_front_img && !aadhar_back_img && !pan_front_img) {
        return res.status(400).json({ message: "⚠️ Missing documents uploaded" });
      }

      const sql = `
        UPDATE users 
        SET 
          aadhar_front_img = ?, 
          aadhar_back_img = ?, 
          pan_front_img = ?,
          status = 'approve-pending',
          status_code = 4,
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
        return res.status(404).json({ message: `❌ Step5: No user found with user_id ${user_id}` });
      }

      res.status(200).json({
        message: "✅ Step4: Documents uploaded successfully",
        status: "approve-pending",
        status_code: 4,
        files: { aadhar_front_img, aadhar_back_img, pan_front_img },
      });
    } catch (err) {
      res.status(500).json({ message: "❌ Step4: Failed to upload documents", error: err.message });
    }
  }
);

// Admin Approve Here status Set 
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"; // Use env var in production

router.post("/admin/approve/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    // First check if user exists
    const [users] = await db.query(
      "SELECT user_id, email, phone_number, status FROM users WHERE user_id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: `❌ Step6: No user found with user_id ${user_id}` });
    }
    const user = users[0];
    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        phone_number: user.phone_number,
        status: "active", 
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const sql = `UPDATE users 
                 SET status = 'active', status_code = 5, approved_at = NOW(), token = ? 
                 WHERE user_id = ?`;
    const [result] = await db.query(sql, [token, user_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `❌ Step6: No user found with user_id ${user_id}` });
    }

    res.status(200).json({
      message: "✅ Step5: User approved successfully",
      status: "active",
      status_code: 5,
      result: { user_id, status: "active", status_code: 5, token },
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Step5: Failed to approve user", error: err.message });
  }
});


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

    res.json({ message: "✅ Users fetched successfully", users });
  } catch (err) {
    res.status(500).json({ message: "❌ Failed to fetch users", error: err.message });
  }
});

router.get("/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: `❌ No user found with user_id ${user_id}` });
    }

    const user = {
      ...rows[0],
      profile_img: rows[0].profile_img ? `${req.protocol}://${req.get("host")}/uploads/${rows[0].profile_img}` : null,
      aadhar_front_img: rows[0].aadhar_front_img ? `${req.protocol}://${req.get("host")}/uploads/${rows[0].aadhar_front_img}` : null,
      aadhar_back_img: rows[0].aadhar_back_img ? `${req.protocol}://${req.get("host")}/uploads/${rows[0].aadhar_back_img}` : null,
      pan_front_img: rows[0].pan_front_img ? `${req.protocol}://${req.get("host")}/uploads/${rows[0].pan_front_img}` : null,
    };

    res.json({ message: "✅ User fetched successfully", user });
  } catch (err) {
    res.status(500).json({ message: "❌ Failed to fetch user", error: err.message });
  }
});

module.exports = router;

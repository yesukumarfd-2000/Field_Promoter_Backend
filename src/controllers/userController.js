const db = require("../config/db");

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "❌ Error fetching users", error: err.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "⚠️ Name and Email are required" });
    }

    await db.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
    res.status(201).json({ message: "✅ User created successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error creating user", error: err.message });
  }
};

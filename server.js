const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const userRoutes = require("./src/routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// Routes
// app.use("/api/v1/admin/user", userRoutes);
app.use("/api/v1/users", userRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Backend is running successfully");
});

app.listen(process.env.PORT, () => {
  console.log(`✅ Server running at http://localhost:${process.env.PORT}`);
});

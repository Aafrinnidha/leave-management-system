require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/db");
const leaveRoutes = require("./routes/leaveRoutes");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/test", (req, res) => {
  res.json({
    message: "Leave Management System server is working!"
  });
});

app.use("/api", leaveRoutes);

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

require("dotenv").config();
require("express-async-errors"); // lets async route handlers throw and reach errorHandler

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const { errorHandler, notFound } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const bookRoutes = require("./routes/books.routes");
const categoryRoutes = require("./routes/categories.routes");
const borrowingRoutes = require("./routes/borrowings.routes");
const reservationRoutes = require("./routes/reservations.routes");
const fineRoutes = require("./routes/fines.routes");
const notificationRoutes = require("./routes/notifications.routes");
const reportRoutes = require("./routes/reports.routes");
const settingsRoutes = require("./routes/settings.routes");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving uploaded cover images cross-origin
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Static serving of uploaded book cover images
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/borrowings", borrowingRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/fines", fineRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

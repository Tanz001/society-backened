// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth/authRoutes.js");
const userRoutes = require("./routes/user/userRoutes.js");
const adminRoutes = require("./routes/admin/adminRoutes.js");
const societyRoutes = require("./routes/society/societyRoutes.js");

const app = express();
const PORT = 5000;

// CORS configuration - MUST BE FIRST
const corsOptions = {
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options(/.*/, cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get("/", (req, res) => {
  res.send("Hello, Express server is running!");
});

// Serve static files from assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Auth routes
app.use("/", authRoutes);

// User routes
app.use("/user", userRoutes);

// Society routes
app.use("/society", societyRoutes);

// Admin routes
app.use("/admin", adminRoutes);

// 404 handler
app.use((req, res, next) => {
  console.log('404 Not Found:', req.method, req.url);
  return res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: err.message
    });
  }

  // Handle other errors
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
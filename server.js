require("dotenv").config();
const express = require("express");
const helmet = require('helmet');
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yamljs");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const multer = require("multer");
const rateLimit = require('express-rate-limit'); // ✅ added
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const port = process.env.PORT || 80;

let db = require("./dbConnection");

// CORS
app.options("*", cors({ origin: "http://localhost:3000" }));
app.use(cors({ origin: "http://localhost:3000" }));

// Helmet Security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// Global Rate Limiting Middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: "Too many requests, please try again later.",
    },
});
app.use(limiter); // apply globally

// Swagger Docs
const swaggerDocument = yaml.load("./index.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// JSON & URL parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
const routes = require("./routes");
routes(app);

app.use("/api", uploadRoutes);
app.use("/uploads", express.static("uploads"));

// Error handler
app.use((err, req, res, next) => {
    if (err) {
        res.status(400).json({ error: err.message });
    } else {
        next();
    }
});

app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    exec(`start http://localhost:${port}/api-docs`);
});
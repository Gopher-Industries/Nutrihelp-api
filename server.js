require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yamljs");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 80;

let db = require("./dbConnection");

app.options("*", cors({ origin: "http://localhost:3000" }));
app.use(cors({ origin: "http://localhost:3000" }));

const swaggerDocument = yaml.load("./index.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const routes = require("./routes");
routes(app);

app.listen(port, async () => {
	console.log(`Server is running on port ${port}`);
	exec(`start http://localhost:${port}/api-docs`);
});

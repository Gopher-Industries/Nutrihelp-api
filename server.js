require('dotenv').config();
const express = require('express');
const cors = require("cors");

const app = express();
const port = process.env.PORT || 80;

let db = require("./dbConnection");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.options("*", cors({ origin: 'http://localhost:3000' }));
app.use(cors({ origin: "http://localhost:3000"}));

const routes = require('./routes')
routes(app)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
const express = require("express");
const router = express.Router();
const {
  addSubscribe,
} = require("../controller/homeServiceController");

router.post("/", addSubscribe);


module.exports = router;

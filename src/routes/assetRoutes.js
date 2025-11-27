const express = require("express");
const router = express.Router();
const { create, list, assignAsset } = require("../controllers/assetController");
router.post("/create", create);
router.get("/list", list);
router.post("/assign", assignAsset);
module.exports = router;

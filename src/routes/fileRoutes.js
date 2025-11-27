const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const fileController = require("../controllers/fileController");

// Single upload: expects field name `file`
router.post("/upload", upload.single("file"), fileController.singleUpload);

// Multi upload: expects field name `files` (multiple)
router.post("/multi-upload", upload.array("files"), fileController.multiUpload);

module.exports = router;

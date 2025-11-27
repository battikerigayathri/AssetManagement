const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const { File } = require("../models/Index");
const { encryptJson } = require("../helperFunctions/file");
const BASE_URL = "https://assets.mercuryx.cloud/sandbox";
const API_KEY = process.env.API_KEY;
const APP_SECRET = process.env.APP_SECRET || "";
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = {
  IMAGE: "image/",
  VIDEO: "video/",
  PDF: "application/pdf",
};
const FILE_TYPES = {
  IMAGE: "image",
  VIDEO: "video",
  PDF: "pdf",
  OTHER: "other",
};

const getFileType = (mimeType) => {
  if (mimeType.startsWith(SUPPORTED_MIME_TYPES.IMAGE)) return FILE_TYPES.IMAGE;
  if (mimeType.startsWith(SUPPORTED_MIME_TYPES.VIDEO)) return FILE_TYPES.VIDEO;
  if (mimeType === SUPPORTED_MIME_TYPES.PDF) return FILE_TYPES.PDF;
  return FILE_TYPES.OTHER;
};

const getAxiosHeaders = (formData) => ({
  ...(formData ? formData.getHeaders() : {}),
  "x-api-key": API_KEY || "",
  Authorization: encryptJson(APP_SECRET),
});

const getAxiosConfig = (formData, fileSize = 0) => {
  const baseTimeout = 30000;
  const additionalTimeout = Math.floor(fileSize / (10 * 1024 * 1024)) * 10000;
  const timeout = Math.min(baseTimeout + additionalTimeout, 600000); // Max 10 minutes

  return {
    headers: getAxiosHeaders(formData),
    timeout,
    maxBodyLength: MAX_TOTAL_SIZE,
    maxContentLength: MAX_TOTAL_SIZE,
  };
};

const createSignedUrl = async (key) => {
  const formData = new FormData();
  formData.append("key", key);
  formData.append("eat", "-1");

  try {
    const response = await axios.post(`${BASE_URL}/get-signed-url`, formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": API_KEY || "",
        Authorization: encryptJson(APP_SECRET),
      },
      timeout: 30000,
    });

    if (!response.data?.path) {
      throw new Error("Failed to retrieve signed URL");
    }
    return `https://assets.mercuryx.cloud${response.data.path}`;
  } catch (error) {
    console.error(`Signed URL creation failed for key ${key}:`, error);
    throw error;
  }
};

const normalizeRequestFiles = (req) => {
  // multer single-file
  if (req.file) {
    const f = req.file;
    return {
      file: {
        data: f.buffer,
        name: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      },
    };
  }

  // multer array (req.files is an array)
  if (Array.isArray(req.files) && req.files.length) {
    const files = req.files.map((f) => ({
      data: f.buffer,
      name: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
    }));
    return { files };
  }

  // express-fileupload shape: req.files may be an object with keys
  if (req.files && typeof req.files === "object") {
    if (req.files.file) {
      const f = Array.isArray(req.files.file)
        ? req.files.file[0]
        : req.files.file;
      return {
        file: {
          data: f.data,
          name: f.name,
          mimetype: f.mimetype,
          size: f.size,
        },
      };
    }
    if (req.files.files) {
      const arr = Array.isArray(req.files.files)
        ? req.files.files
        : [req.files.files];
      const files = arr.map((x) => ({
        data: x.data,
        name: x.name,
        mimetype: x.mimetype,
        size: x.size,
      }));
      return { files };
    }
  }

  return {};
};

const trackUploadProgress = (req, res, next) => {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`Upload completed in ${duration}ms`);
  });
  next();
};

// =========================================================================
// 🚀 CONTROLLER: SINGLE FILE UPLOAD
// =========================================================================
const singleUpload = async (req, res) => {
  const uploadStartTime = Date.now();
  try {
    const normalized = normalizeRequestFiles(req);
    const file = normalized.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }
    const { path } = req.body;
    if (!path) {
      return res
        .status(400)
        .json({ success: false, error: "Path is required" });
    }
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds maximum limit of ${
          MAX_FILE_SIZE / (1024 * 1024)
        }MB`,
      });
    }
    // 1. Prepare and Upload File to External API
    const formData = new FormData();
    formData.append("path", path);
    formData.append("file", file.data, {
      filename: file.name,
      contentType: file.mimetype,
    });
    const uploadResponse = await axios.post(
      `${BASE_URL}/upload`,
      formData,
      getAxiosConfig(formData, file.size)
    );
    console.log(uploadResponse, "uploadResponse");
    const key = uploadResponse.data?.object?.key;
    console.log(key, "key");
    if (!key) {
      return res.status(500).json({
        success: false,
        error: "Failed to retrieve file key from API",
      });
    }
    // 2. Get Signed URL and Save to DB (Parallel)
    const fileType = getFileType(file.mimetype);
    const signedPath = await createSignedUrl(key);
    const fileData = await File.create({
      originalName: file.name,
      filePath: key,
      size: file.size,
      mimeType: file.mimetype,
      url: signedPath,
      type: fileType,
    });
    console.log(fileData, "fileData");
    const totalTime = Date.now() - uploadStartTime;
    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: fileData,
      uploadTime: `${totalTime}ms`,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    });
  } catch (error) {
    const totalTime = Date.now() - uploadStartTime;
    console.error(`Upload failed after ${totalTime}ms:`, error);
    return res.status(500).json({
      success: false,
      error: "File upload failed",
      details: error.message || "Unknown error",
      uploadTime: `${totalTime}ms`,
    });
  }
};

// =========================================================================
// 🚀 CONTROLLER: MULTI-FILE UPLOAD
// =========================================================================
const multiUpload = async (req, res) => {
  const uploadStartTime = Date.now();
  try {
    const normalized = normalizeRequestFiles(req);
    const files = normalized.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No files uploaded" });
    }
    const { path } = req.body;
    if (!path) {
      return res
        .status(400)
        .json({ success: false, error: "Path is required" });
    }
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    // 1. Prepare and Upload Files to External API
    const formData = new FormData();
    formData.append("path", path);
    files.forEach((file) => {
      formData.append("files", file.data, {
        filename: file.name,
        contentType: file.mimetype,
      });
    });
    const uploadResponse = await axios.post(
      `${BASE_URL}/multi-upload`,
      formData,
      getAxiosConfig(formData, totalSize)
    );
    if (
      !uploadResponse.data?.objects ||
      !Array.isArray(uploadResponse.data.objects)
    ) {
      return res
        .status(500)
        .json({ success: false, error: "Invalid response from upload API" });
    }
    // 2. Process files (get signed URL and save to DB concurrently)
    const uploadResults = await Promise.allSettled(
      files.map(async (file, index) => {
        const uploadedFile = uploadResponse.data.objects[index];

        if (!uploadedFile?.key) {
          throw new Error("No upload metadata found for file: " + file.name);
        }
        const fileType = getFileType(file.mimetype);
        const signedPath = await createSignedUrl(uploadedFile.key);
        return await File.create({
          originalName: file.name,
          filePath: uploadedFile.key,
          size: file.size,
          mimeType: file.mimetype,
          url: signedPath,
          type: fileType,
        });
      })
    );
    const successfulUploads = uploadResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const failedUploads = uploadResults
      .filter((result) => result.status === "rejected")
      .map((result, idx) => ({
        name: files[idx].name,
        error: result.reason?.message || "Unknown error",
      }));
    const totalTime = Date.now() - uploadStartTime;
    return res.status(200).json({
      success: true,
      message: "Multi-file upload completed",
      totalFiles: files.length,
      successful: successfulUploads.length,
      failed: failedUploads.length,
      files: successfulUploads,
      errors: failedUploads,
      uploadTime: `${totalTime}ms`,
      totalSize: `${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
    });
  } catch (error) {
    const totalTime = Date.now() - uploadStartTime;
    console.error(`Multi-upload failed after ${totalTime}ms:`, error);
    return res.status(500).json({
      success: false,
      error: "Multi-file upload failed",
      details: error.message || "Unknown error",
      uploadTime: `${totalTime}ms`,
    });
  }
};

// =========================================================================
// 🚀 CONTROLLER: UPDATE FILE
// =========================================================================
const updateFile = async (req, res) => {
  try {
    const normalized = normalizeRequestFiles(req);
    const file = normalized.file;
    const { key } = req.body;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }
    if (!key) {
      return res
        .status(400)
        .json({ success: false, error: "File key is required" });
    }
    const formData = new FormData();
    formData.append("file", file.data, {
      filename: file.name,
      contentType: file.mimetype,
    });
    // 1. Update file on Mercury Asset API
    const response = await axios.put(
      `${BASE_URL}/file/${key}`,
      formData,
      getAxiosConfig(formData, file.size)
    );
    // 2. Mongoose DB Update
    const updatedFile = await File.findOneAndUpdate(
      { filePath: key },
      {
        originalName: file.name,
        size: file.size,
        mimeType: file.mimetype,
        url: `${BASE_URL}/file/${key}`,
        type: getFileType(file.mimetype),
      },
      { new: true }
    );
    if (!updatedFile) {
      return res.status(404).json({
        success: false,
        error: "File record not found in database for update.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "File updated successfully",
      file: updatedFile,
    });
  } catch (error) {
    console.error("File update failed:", error);
    return res.status(500).json({
      success: false,
      error: "File update failed",
      details: error.message || "Unknown error",
    });
  }
};

// =========================================================================
// 🚀 CONTROLLER: DELETE FILE
// =========================================================================
const deleteFile = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res
        .status(400)
        .json({ success: false, error: "File key is required" });
    }
    // 1. Delete from Mercury Asset API
    await axios.delete(`${BASE_URL}/file/${key}`, {
      headers: getAxiosHeaders(),
      timeout: 15000,
    });
    // 2. Delete from Mongoose Database
    const deletedFile = await File.findOneAndDelete({ filePath: key });

    if (!deletedFile) {
      console.warn(
        `Attempted to delete key ${key} from Mercury, but record not found in DB.`
      );
    }
    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("File deletion failed:", error);
    return res.status(500).json({
      success: false,
      error: "File deletion failed",
      details: error.message || "Unknown error",
    });
  }
};

module.exports = {
  singleUpload,
  multiUpload,
  updateFile,
  deleteFile,
  trackUploadProgress,
};

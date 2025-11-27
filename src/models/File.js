const mongoose = require("mongoose");
const FileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    extension: {
      type: String,
    },
    size: {
      type: Number,
    },
    url: {
      type: String,
    },
    mediaId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("File", FileSchema);

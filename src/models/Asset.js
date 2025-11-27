const mongoose = require("mongoose");
const assetSchema = new mongoose.Schema(
  {
    asset_name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    serial_number: {
      type: Number,
      required: [true, "Enter Serial_Number"],
    },
    purchase_date: {
      type: Date,
    },
    cost: {
      type: String,
      required: [true, "Cost is required"],
    },
    description: {
      type: String,
    },
    asset_image: {
      type: mongoose.Schema.ObjectId,
      default: "File",
    },
    status: {
      type: String,
      enum: ["Active", "In Storage", "Maintenance", "Retired"],
      default: "Active",
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
    created_by: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    assigned_to: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Asset", assetSchema);

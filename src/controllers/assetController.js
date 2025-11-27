const { Asset, Category, User } = require("../models/Index");
exports.create = async (req, res) => {
  try {
    const {
      asset_name,
      category_id,
      serial_number,
      purchase_date,
      cost,
      description,
      asset_image,
      user,
    } = req.body;
    if (!asset_name || !serial_number || !purchase_date || !cost) {
      return res
        .status(400)
        .json({ message: "Missing required asset fields." });
    }
    const foundCategory = await Category.findById(category_id);
    if (!foundCategory) {
      return res
        .status(404)
        .json({ message: "The provided category ID does not exist." });
    }
    const existingAsset = await Asset.findOne({ serial_number });
    if (existingAsset) {
      return res
        .status(400)
        .json({ message: "Asset with this Serial Number already exists." });
    }
    const newAsset = await Asset.create({
      asset_name,
      category: category_id,
      serial_number,
      purchase_date,
      cost,
      description,
      asset_image,
      created_by: user,
    });
    res.status(201).json({
      success: true,
      data: newAsset,
      message: "Asset created successfully!",
    });
  } catch (error) {
    console.error("❌ Error creating asset:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid Category ID format." });
    }
    res.status(500).json({ message: "Server error during asset creation." });
  }
};
exports.list = async (req, res) => {
  try {
    const assets = await Asset.find({}).sort({ serial_number: 1 }).lean();
    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
      message: "Assets retrieved successfully.",
    });
  } catch (error) {
    console.error("❌ Error retrieving categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error during assets retrieval.",
    });
  }
};
exports.assignAsset = async (req, res) => {
  try {
    const { assetId, userId, issueDate, notes, force } = req.body;
    if (!assetId || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "assetId and userId are required." });
    }
    const asset = await Asset.findById(assetId);
    if (!asset)
      return res
        .status(404)
        .json({ success: false, message: "Asset not found." });
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (asset.assigned_to && asset.assigned_to.toString() !== userId) {
      if (!force) {
        return res.status(409).json({
          success: false,
          message:
            "Asset is already assigned to another user. Set `force=true` to override.",
          assigned_to: asset.assigned_to,
        });
      }
    }
    const previousAssigned = asset.assigned_to
      ? asset.assigned_to.toString()
      : null;
    asset.assigned_to = userId;
    asset.notes = notes;
    asset.issueDate = issueDate;
    if (
      asset.status === "In Storage" ||
      asset.status === "Maintenance" ||
      !asset.status
    ) {
      asset.status = "Active";
    }
    if (issueDate) {
      asset.issueDate = new Date(issueDate);
    }
    await asset.save();
    return res.status(200).json({
      success: true,
      message: "Asset assigned successfully.",
      data: {
        asset: asset,
        previousAssigned,
        issueDate: asset.issueDate,
        notes: notes || null,
      },
    });
  } catch (error) {
    console.error("❌ Error assigning asset:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format provided for assetId or userId.`,
        details: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error during asset assignment.",
      details: error.message,
    });
  }
};

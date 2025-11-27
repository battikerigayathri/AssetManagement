const { Asset } = require("../models/Index");
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
    // const foundCategory = await Category.findById(category_id);
    // if (!foundCategory) {
    //   return res
    //     .status(404)
    //     .json({ message: "The provided category ID does not exist." });
    // }
    const existingAsset = await Asset.findOne({ serial_number });
    if (existingAsset) {
      return res
        .status(400)
        .json({ message: "Asset with this Serial Number already exists." });
    }
    const newAsset = await Asset.create({
      asset_name,
      // category: category_id,
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

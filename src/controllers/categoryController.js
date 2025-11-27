const { Category } = require("../models/Index");

exports.create = async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "The 'name' field is required for category creation.",
      });
    }
    const newCategory = await Category.create({
      name,
      description,
      createdBy,
    });
    res.status(201).json({
      success: true,
      message: "Category created successfully!",
      data: newCategory,
    });
  } catch (error) {
    console.error("❌ Error creating category:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Category name '${req.body.name}' already exists.`,
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error during category creation.",
    });
  }
};
exports.list = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 }).lean();
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
      message: "Categories retrieved successfully.",
    });
  } catch (error) {
    console.error("❌ Error retrieving categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error during category retrieval.",
    });
  }
};

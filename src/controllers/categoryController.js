const { Category } = require("../models/Index"); // Adjust path as necessary

exports.create = async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;

    // 1. Validation (Mongoose schema also validates, but explicit check for name is fast)
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: "The 'name' field is required for category creation." 
      });
    }

    // 2. Attempt to create the new category
    const newCategory = await Category.create({
      name,
      description,
      createdBy,
    });

    // 3. Success response
    res.status(201).json({
      success: true,
      message: "Category created successfully!",
      data: newCategory,
    });
  } catch (error) {
    console.error("❌ Error creating category:", error);

    // Handle E11000 duplicate key error (for unique: true on 'name')
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Category name '${req.body.name}' already exists.`,
      });
    }
    
    // Handle other validation errors (e.g., maxlength)
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
            success: false,
            message: "Validation failed.",
            errors: errors
        });
    }

    // Default server error
    res.status(500).json({ 
      success: false, 
      message: "Server error during category creation." 
    });
  }
};
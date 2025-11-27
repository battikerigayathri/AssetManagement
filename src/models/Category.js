const mongoose = require('mongoose');
const CategorySchema = new mongoose.Schema(
  {
    // Category Name (e.g., "Laptops", "Monitors", "Software Licenses")
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true, // Categories should be unique
      trim: true,
      maxlength: 50,
    },
    
    // Optional: Description for the category
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },

    // Reference to the user who created the category (optional, but good practice)
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User', 
      required: false, // Set to true if categories must be user-created
    },
  },
  { 
    timestamps: true 
  }
);

module.exports = mongoose.model('Category', CategorySchema);
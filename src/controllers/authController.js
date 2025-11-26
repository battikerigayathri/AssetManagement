const { User } = require("../models/Index");
// SignUp Api
exports.signUp = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = await User.create({
      name,
      email,
      password,
      role,
    });
    res.status(201).json({
      success: true,
      user: user,
      message: "✅ Register Successull...!!!",
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ message: error.message });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // --- 1. Basic Validation ---
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both email and password.",
      });
    }
    // --- 2. Find User by Email ---
    const user = await User.findOne({ email }).select("+password");
    // --- 3. Check Credentials ---
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }
    // Use the matchPassword method defined on the User schema
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }
    // --- 4. Success Response ---
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;
    res.status(200).json({
      success: true,
      message: "✅ User successfully logged in.",
      user: userWithoutPassword,
      // token: token, // Send the token here
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

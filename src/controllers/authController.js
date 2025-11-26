const User=require("../models/Index")
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
      otp,
      otpExpires,
    });

    res.status(201).json({
      success: true,
      user: user,
      message:
        "✅ Register Successull...!!!",
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ message: error.message });
  }
};

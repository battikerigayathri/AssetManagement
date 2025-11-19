require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();
app.get('/', (req, res) => {
  res.send('Server is running');
});
// Start server
app.listen(PORT, () => {
  console.log(`🌍 Server running on http://localhost:${PORT}`);
});

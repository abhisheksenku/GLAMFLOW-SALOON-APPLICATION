// index.js
require('dotenv').config()
// --- ADD THESE LINES FOR DEBUGGING ---
console.log("--- Checking Environment Variables ---");
console.log("Cashfree App ID:", process.env.CF_APP_ID);
console.log("Cashfree Secret Key:", process.env.CF_SECRET_KEY);
console.log("------------------------------------");

const express = require('express');
const sequelize = require('./utilities/sql');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");
const cookieParser = require("cookie-parser");
const cron = require('node-cron');
const http = require('http');
const morgan = require('morgan');
const fs = require('fs');
require("./services/reminderService");
const accessLogStream = fs.createWriteStream(
    path.join(__dirname,'access.log'),
    {flags:'a'}
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(morgan('combined',{stream:accessLogStream}));

const Model = require('./models/associations');
const reminderService = require("./services/reminderService");

const userAuthenticate =  require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const staffRoutes = require('./routes/staffRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const {initializeSocket} = require("./socket/index")
const server = http.createServer(app);
const io = initializeSocket(server);
app.set("socket",io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff',staffRoutes)
app.use('/api/bookings', bookingRoutes);
app.use("/api/reviews/", reviewRoutes);
app.use('/api/payments', paymentRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "page.html"));
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});
app.get("/customer",userAuthenticate.authenticate,(req,res)=>{
  res.sendFile(path.join(__dirname, "views", "customer.html"));
});
app.get("/admin",userAuthenticate.authenticate,(req,res)=>{
  res.sendFile(path.join(__dirname, "views", "admin.html"));
})
app.get("/staff",userAuthenticate.authenticate,(req,res)=>{
  res.sendFile(path.join(__dirname, "views", "staff.html"));
});
app.get('/forgot-password',(req,res)=>{
    res.sendFile(path.join(__dirname,"views","forgotPassword.html"))
});
app.get('/reset-password/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reset-password.html'));
});

async function startServer() {
  try {
    // This creates the tables if they don't exist
    await sequelize.sync({ force: false }); 
    // For development, you might use { force: true } to drop and recreate tables on every start.
    // Be careful: await sequelize.sync({ force: true }); WILL DELETE ALL YOUR DATA.

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log('Database synced successfully.');
    });
  } catch (error) {
    console.error('Unable to sync database:', error);
  }
}

startServer();
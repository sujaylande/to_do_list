const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const connectToDb = require('./db/db');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const mapsRoutes = require('./routes/maps.routes');
const rideRoutes = require('./routes/ride.routes');
const cron = require('node-cron');
const captainModel = require('./models/captain.model');
const paymentRoutes = require('./routes/payment.routes');
const paymentModel = require('./models/payment.model');
const {connectRedis} = require('./db/redis');

connectToDb();
connectRedis();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/users', userRoutes);
app.use('/captains', captainRoutes);
app.use('/maps', mapsRoutes);
app.use('/rides', rideRoutes);
app.use('/payment', paymentRoutes);


//this cron job will run every day at 12:00 AM
cron.schedule('0 0 * * *', async () => {
  const overdueDrivers = await paymentModel.find({
    billingEndDate: { $lte: new Date() }, 
  });

  overdueDrivers.forEach(async (captain) => {
    await captainModel.findByIdAndUpdate(captain.captainID, { isBlocked: true });
  });

  console.log("Payment check completed and overdue drivers blocked.");
});



module.exports = app;


const rideService = require("../services/ride.service");
const { validationResult } = require("express-validator");
const mapService = require("../services/maps.service");
const { sendMessageToSocketId } = require("../socket");
const rideModel = require("../models/ride.model");
const captainModel = require("../models/captain.model");

module.exports.createRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination, vehicleType } = req.body;

  const { fare, durationInMinutes } = await rideService.getFare(
    pickup,
    destination
  );

  const distanceString = durationInMinutes[vehicleType].distance; // e.g., "76.32 km"
  const durationString = durationInMinutes[vehicleType].duration; // e.g., "1 hours and 47 minutes"
  
  // Convert distance to a number
  const distance = parseFloat(distanceString.replace(' km', ''));
  
  // Convert duration to total minutes
  let totalMinutes = 0;
  const hoursMatch = durationString.match(/(\d+)\s*hours?/); // Match hours
  const minutesMatch = durationString.match(/(\d+)\s*minutes?/); // Match minutes
  
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60; // Convert hours to minutes
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]); // Add minutes
  }
  
  console.log("create ride", distance); // 76.32 (as a number)
  console.log("create ride", totalMinutes); // 107 (total minutes)
  
  try{
  // Store the parsed values in the database
  const ride = await rideService.createRide({
    user: req?.user?._id,
    pickup,
    destination,
    vehicleType,
    distance, // Store as a number
    duration: totalMinutes // Store as a number
  });
  
  res.status(201).json(ride);

    const pickupCoordinates = await mapService.getAddressCoordinate(pickup);

    const captainsInRadius = await mapService.getCaptainsInTheRadius(
      pickupCoordinates.ltd,
      pickupCoordinates.lng,
      2
    );

    ride.otp = "";

    const rideWithUser = await rideModel
      .findOne({ _id: ride?._id })
      .populate("user");

    console.log("rideWithUser:", rideWithUser);

    captainsInRadius.map((captain) => {
      if(!captain.isBlocked){
        sendMessageToSocketId(captain.socketId, {
          event: "new-ride",
          data: rideWithUser,
        });
      }
    });


  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports.getFare = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination } = req.query;

  try {
    const { fare, durationInMinutes } = await rideService.getFare(
      pickup,
      destination
    );

    return res.status(200).json({ fare, durationInMinutes });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.confirmRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.body;

  try {
    const ride = await rideService.confirmRide({
      rideId,
      captain: req.captain,
    });

    sendMessageToSocketId(ride.user.socketId, {
      event: "ride-confirmed",
      data: ride,
    });

    return res.status(200).json(ride);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports.startRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId, otp } = req.query;

  try {
    const ride = await rideService.startRide({
      rideId,
      otp,
      captain: req.captain,
    });

    sendMessageToSocketId(ride.user.socketId, {
      event: "ride-started",
      data: ride,
    });

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.endRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.body;

  // console.log("rideId:", rideId);

  try {
    const ride = await rideService.endRide({ rideId, captain: req.captain });

    console.log("ride:", ride);

    sendMessageToSocketId(ride.user.socketId, {
      event: "ride-ended",
      data: ride,
    });

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.acceptRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.body;

  try {
    // const ride = await rideService.acceptRide({ rideId, captain: req.captain });
    const ride = await rideModel.findById(rideId);
    const captainId = req.captain._id;

    if (!ride) {
      throw new Error("Ride not found");
    } // Add captain ID to the queue if not already present

    console.log(captainId);

    if (!ride.acceptedCaptains.includes(captainId)) {
      ride.acceptedCaptains.push(captainId);
      await ride.save();
    }

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.isFirstInQueue = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.query;
    const captainId = req.captain._id;

  try {
    const ride = await rideModel.findById(rideId);


    if (!ride) {
      throw new Error("Ride not found");
    }

    if (ride.acceptedCaptains[0].toString() === captainId.toString()) {
        return res.status(200).json({ isFirstInQueue: true });
      } else {
        return res.status(200).json({ isFirstInQueue: false });
      }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.isQueueEmpty = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.query;

  try {
    const ride = await rideModel.findById(rideId);

    if (!ride) {
      throw new Error("Ride not found");
    }

    if (ride.acceptedCaptains.length === 0) {
      return res.status(200).json({ isQueueEmpty: true });
    } else {
      return res.status(200).json({ isQueueEmpty: false });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

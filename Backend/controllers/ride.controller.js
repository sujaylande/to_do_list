const rideService = require("../services/ride.service");
const { validationResult } = require("express-validator");
const mapService = require("../services/maps.service");
const { sendMessageToSocketId } = require("../socket");
const rideModel = require("../models/ride.model");
const captainModel = require("../models/captain.model");
const { client } = require('../db/redis');
const mongoose = require('mongoose');


async function getAvailableCaptains(lat, lng, radius, userVehicleChoice) {
  try {
    // Step 1: Get nearby captains from Redis

    // The closest captains will always appear first unless modified.

    const captainsInRadius = await client.geoSearch(
      "captains",
      { longitude: lng, latitude: lat },
      { radius: radius, unit: "km" },
      { WITHDIST: true }
    );

    console.log("captainsInRadius:", captainsInRadius);

    if (captainsInRadius.length === 0) return []; // No captains found

    // Step 2: Extract captain IDs
    const captainIds = captainsInRadius.map(c => new mongoose.Types.ObjectId(c));

    console.log("Extracted Captain IDs:", captainIds[0]);
    console.log("userVehicleChoice:", userVehicleChoice);

    // Step 3: Query MongoDB for available captains

    // since you're filtering a subset of Redis results, the relative order may remain unchanged.
    const availableCaptains = await captainModel.find(
      { 
        _id: { $in: captainIds },  // Match Redis IDs
        isDriving: false, 
        isBlocked: false, 
        "vehicle.vehicleType": userVehicleChoice  // Access nested vehicleType
      },
      { socketId: 1, _id: 0 } // Select only socketId, exclude _id
    );
    
    console.log("Available Captains:", availableCaptains);

    // Step 4: Shuffle the array
    // availableCaptains.sort(() => Math.random() - 0.5);


    return availableCaptains;
  } catch (err) {
    console.error("Error getting available captains:", err);
    return [];
  }
}



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

    console.log("vehicle in controoler", vehicleType);

    const captainsInRadius = await getAvailableCaptains(pickupCoordinates.ltd, pickupCoordinates.lng, 5, vehicleType);

    console.log("captainsInRadius", captainsInRadius);

    ride.otp = "";

    const rideWithUser = await rideModel
      .findOne({ _id: ride?._id })
      .populate("user");

    captainsInRadius.map((obj) => {

      console.log("captain socket id", obj.socketId);

      sendMessageToSocketId(obj.socketId, {
          event: "new-ride",
          data: rideWithUser,
      });
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

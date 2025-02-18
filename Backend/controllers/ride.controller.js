const rideService = require("../services/ride.service");
const { validationResult } = require("express-validator");
const mapService = require("../services/maps.service");
const { sendMessageToSocketId } = require("../socket");
const rideModel = require("../models/ride.model");
const captainModel = require("../models/captain.model");
const { client, redisPublisher } = require("../db/redis");
const mongoose = require("mongoose");

// async function getAvailableCaptains(lat, lng, radius, userVehicleChoice) {
//   try {
//     // The closest captains will always appear first unless modified.

//     const captainsInRadius = await client.geoSearch(
//       "captains",
//       { longitude: lng, latitude: lat },
//       { radius: radius, unit: "km" },
//       { WITHDIST: true }
//     );

//     // console.log("captainsInRadius:", captainsInRadius);

//     if (captainsInRadius.length === 0) return []; // No captains found

//     // Step 2: Extract captain IDs
//     const captainIds = captainsInRadius.map(c => new mongoose.Types.ObjectId(c));

//     // console.log("Extracted Captain IDs:", captainIds[0]);
//     // console.log("userVehicleChoice:", userVehicleChoice);

//     // Step 3: Query MongoDB for available captains

//     // since you're filtering a subset of Redis results, the relative order may remain unchanged.
//     const availableCaptains = await captainModel.find(
//       {
//         _id: { $in: captainIds },  // Match Redis IDs
//         isDriving: false,
//         isBlocked: false,
//         "vehicle.vehicleType": userVehicleChoice  // Access nested vehicleType
//       },
//       { socketId: 1, _id: 0 } // Select only socketId, exclude _id
//     );

//     // console.log("Available Captains:", availableCaptains);

//     // Step 4: Shuffle the array
//     // availableCaptains.sort(() => Math.random() - 0.5);

//     return availableCaptains;
//   } catch (err) {
//     console.error("Error getting available captains:", err);
//     return [];
//   }
// }

async function getEligibleCaptains(lat, lng, radius, vehicle) {
  try {
    // Get nearby captains from Redis
    const nearbyCaptains = await client.geoSearch(
      "captains",
      { longitude: lng, latitude: lat },
      { radius: radius, unit: "km" },
      { WITHDIST: true }
    );

    if (!nearbyCaptains || nearbyCaptains.length === 0) {
      console.log("No captains found nearby.");
      return [];
    }

    console.log("Nearby Captains:", nearbyCaptains);

    // Fetch details for each captain
    const promises = nearbyCaptains.map(async (captainId) => {
      const details = await client.hGetAll(`captain:${captainId}`);
      return { captainId, details };
    });

    const results = await Promise.all(promises);

    // Ensure results are valid
    if (!Array.isArray(results)) {
      console.error(
        "Error: Redis Promise.all() did not return an array:",
        results
      );
      return [];
    }

    // Filter eligible captains
    const eligibleCaptains = results
      .filter(
        ({ details }) =>
          details &&
          details.isBlocked !== "true" &&
          details.isDriving !== "true" &&
          details.vehicleType === vehicle
      )
      .map(({ captainId }) => captainId);

    console.log("Eligible Captains:", eligibleCaptains);
    return eligibleCaptains;
  } catch (error) {
    console.error("Error fetching eligible captains:", error);
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
  const distance = parseFloat(distanceString.replace(" km", ""));

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

  try {
    // Store the parsed values in the database
    const ride = await rideService.createRide({
      user: req?.user?._id,
      pickup,
      destination,
      vehicleType,
      distance, // Store as a number
      duration: totalMinutes, // Store as a number
    });

    res.status(201).json(ride);

    const pickupCoordinates = await mapService.getAddressCoordinate(pickup);

    // console.log("vehicle in controoler", vehicleType);

    const captainsInRadius = await getEligibleCaptains(
      pickupCoordinates.ltd,
      pickupCoordinates.lng,
      5,
      vehicleType
    );

    // console.log("captainsInRadius", captainsInRadius);

    ride.otp = "";

    const rideWithUser = await rideModel
      .findOne({ _id: ride?._id })
      .populate("user");

    console.log("ride with user", rideWithUser);

    captainsInRadius.forEach(async (captainId) => {
      console.log(" request sent to captain", captainId);
      await redisPublisher.publish(
        `ride_request:${captainId}`,
        JSON.stringify(rideWithUser)
      );
    });

    //   captainsInRadius.map((obj) => {

    //     console.log("captain socket id", obj.socketId);

    //     sendMessageToSocketId(obj.socketId, {
    //         event: "new-ride",
    //         data: rideWithUser,
    //     });
    // });

    // await client.publish("ride_requests", JSON.stringify(ride));
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

    console.log(
      "comfirm ride message send to user socket id",
      ride.user.socketId
    );

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

    await client.hSet(`captain:${req.captain._id}`, "isDriving", "1");

    sendMessageToSocketId(ride.user.socketId, {
      event: "ride-started",
      data: ride,
    });

    //  cleaning up Redis keys
    await client.del(`ride:${rideId}:captains`);
    // await client.del(`ride:${rideId}:locked`);

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

    await client.hSet(`captain:${req.captain._id}`, "isDriving", "0");

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

  console.log("accept ride req boby:", req.body);

  try {
    // const ride = await rideService.acceptRide({ rideId, captain: req.captain });
    const ride = await rideModel.findById(rideId);
    const captainId = req.captain._id;

    console.log(" accept ride, ride:", ride);
    console.log(" accept ride, captainId:", captainId);

    if (!ride) {
      throw new Error("Ride not found");
    } // Add captain ID to the queue if not already present

    // if (!ride.acceptedCaptains.includes(captainId)) {
    //   ride.acceptedCaptains.push(captainId);
    //   await ride.save();
    // }

    const timestamp = Date.now();
    await client.zAdd(`ride:${rideId}:captains`, [
      { score: timestamp, value: captainId.toString() },
    ]);

    console.log("Captain added to the queue");

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

    async function assignCaptain(rideId) {
      const [captainId] = await client.zRange(`ride:${rideId}:captains`, 0, 0);

      if (!captainId) return null; // No captain accepted

      //we dont need we are safe with redis
      // Lock the ride to prevent race conditions
      // const locked = await client.set(`ride:${rideId}:locked`, "true", { NX: true, EX: 5 });
      // if (!locked) return null; // Another process already assigned a captain

      //final redis validation
      const isDriving = await client.hGet(`captain:${captainId}`, "isDriving");
      const isBlocked = await client.hGet(`captain:${captainId}`, "isBlocked");
      if (isDriving === "true" || isBlocked === "true") return null; // Captain is no longer available

      return captainId;
    }

    // if(assignCaptain(rideId) == null) {
    //   return res.status(200).json({ isFirstInQueue: false });
    // }

    const fristCaptain = await assignCaptain(rideId);
    if (!fristCaptain) return res.status(200).json({ isFirstInQueue: false });

    console.log("assignCaptain:", fristCaptain?.toString());
    console.log("assignCaptain:", captainId.toString());

    if (fristCaptain.toString() === captainId.toString()) {
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

    const [captainId] = await client.zRange(`ride:${rideId}:captains`, 0, 0);
    // if (!captainId) return null; // No captain accepted

    if (!captainId) {
      return res.status(200).json({ isQueueEmpty: true });
    } else {
      return res.status(200).json({ isQueueEmpty: false });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.cancelRide = async (req, res) => {
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

    // Clear the queue
    await client.del(`ride:${rideId}:captains`);

    //get socket id of user 

    const rideWithUser = await rideModel
      .findOne({ _id: rideId })
      .populate("user");

    // Notify the user
    sendMessageToSocketId(rideWithUser?.user?.socketId, {
      event: "ride-cancelled",
      data: ride,
    });

    //update in mongodb
    await rideModel.findByIdAndUpdate(rideId, { status: "cancelled" });

    //check the status of ride
    const rideStatus = await rideModel.findById(rideId);

    return res.status(200).json({ message: "Ride cancelled" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


module.exports.cancelRideByUser = async (req, res) => {
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

    //get socket id of user 

    const rideWithUser = await rideModel
      .findOne({ _id: rideId })
      .populate("captain");

    // Notify the captain that the ride has been cancelled by socket id
    console.log("canceld by user socket id", rideWithUser?.captain?.socketId)

    sendMessageToSocketId(rideWithUser?.captain?.socketId, {
      event: "ride-cancelled-byuser",
      data: ride,
    });

    //update in mongodb
    await rideModel.findByIdAndUpdate(rideId, { status: "cancelled" });

    //check the status of ride
    const rideStatus = await rideModel.findById(rideId);
    console.log("ride status cancled by user", rideStatus);

    return res.status(200).json({ message: "Ride cancelled" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
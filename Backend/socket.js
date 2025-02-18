const socketIo = require("socket.io");
const userModel = require("./models/user.model");
const captainModel = require("./models/captain.model");
const { client } = require("./db/redis.js");
const { subscribeCaptainToRideRequests } = require("./services/subscribeCaptainToRideRequests.js");

let io;

async function initializeSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // console.log(`Client connected: ${socket.id}`);

    socket.on("join", async (data) => {
        const { userId, userType, captain } = data;

        // console.log("User joined", data);

        if (userType === "user") {
            await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
        } else if (userType === "captain") {
            if (captain) {
                // Create or update captain data in Redis
                await client.hSet(`captain:${userId}`, {
                    isBlocked: captain.isBlocked ? "1" : "0",
                    isDriving: captain.isDriving ? "1" : "0",
                    vehicleType: captain.vehicle.vehicleType,
                    socketId: socket.id, // Store the latest socket ID
                });

                subscribeCaptainToRideRequests(userId, socket);

                // console.log(`Captain ${userId} details updated in Redis.`);
            }

            await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
        }
    });

    let user_id;

    socket.on("update-location-captain", async (data) => {
        const { userId, location } = data;
        user_id = userId;

        if (!location || !location.ltd || !location.lng ) {
            return socket.emit("error", { message: "Invalid location data" });
        }

        await captainModel.findByIdAndUpdate(userId, {
            location: {
                ltd: location.ltd,
                lng: location.lng,
            },
        });

        // Update captain location in Redis
        await client.geoAdd("captains", {
            longitude: location.lng,
            latitude: location.ltd,
            member: userId.toString(), // Ensure ObjectId is stored as string
        });

        // console.log(`Captain ${userId} location updated in Redis.`);
    });

    socket.on("disconnect", async () => {
        // console.log(`Client disconnected: ${socket.id}`);

        if (user_id) {
            // console.log(`Captain ${user_id} disconnected.`);
            
            // Remove captain details from Redis
            await client.del(`captain:${user_id}`);
            await client.zRem("captains", user_id.toString()); // Remove location from Redis
            
            // Update DB socketId to null
            await captainModel.findByIdAndUpdate(user_id, { socketId: null });

            // console.log(`Captain ${user_id} removed from Redis.`);
        }
    });
});


  // io.on("connection", (socket) => {
  //   console.log(`Client connected: ${socket.id}`);

  //   socket.on("join", async (data) => {
  //     const { userId, userType, captain } = data;

  //     console.log("User joined", captain);

  //     if (userType === "user") {
  //       await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
  //     } else if (userType === "captain") {
  //       await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
  //     }
  //   });

  //   let user_id;

  //   socket.on("update-location-captain", async (data) => {
  //     const { userId, location } = data;

  //     user_id = userId;

  //     if (!location || !location.ltd || !location.lng) {
  //       return socket.emit("error", { message: "Invalid location data" });
  //     }

  //     await captainModel.findByIdAndUpdate(userId, {
  //       location: {
  //         ltd: location.ltd,
  //         lng: location.lng,
  //       },
  //     });

  //     await client.geoAdd("captains", {
  //       longitude: location.lng,
  //       latitude: location.ltd,
  //       member: userId.toString(), // Ensure ObjectId is stored as string
  //     });
  //   });

  //   socket.on("disconnect", async () => {
  //     console.log("User disconnected");
  //     if (user_id) {
  //       console.log("User disconnected", user_id);
  //       await client.zRem("captains", user_id.toString()); // Remove location from Redis
  //       await captainModel.findByIdAndUpdate(user_id, { socketId: null });

  //     }
  //     console.log(`Client disconnected: ${socket.id}`);
  //   });
  // });
}

const sendMessageToSocketId = (socketId, messageObject) => {
  if (io) {
    // console.log("Sending message to socketId", socketId);
    io.to(socketId).emit(messageObject.event, messageObject.data);
  } else {
    console.log("Socket.io not initialized.");
  }
};

module.exports = { initializeSocket, sendMessageToSocketId };

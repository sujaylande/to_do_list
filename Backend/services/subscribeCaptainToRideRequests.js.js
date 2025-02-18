const io = require("../socket"); // Import socket instance
const { redisSubscriber } = require('../db/redis');

async function subscribeCaptainToRideRequests(captainId, socket) {
    const rideChannel = `ride_request:${captainId}`;

    console.log(`Subscribing Captain ${captainId} to ${rideChannel}...`);

    await redisSubscriber.subscribe(rideChannel, async (message) => {
        const rideData = JSON.parse(message);
        console.log(`Captain ${captainId} received ride request:`, rideData);

        // Send ride request to captain via WebSocket
        socket.emit("new-ride", rideData);
    });
}

module.exports = { subscribeCaptainToRideRequests };

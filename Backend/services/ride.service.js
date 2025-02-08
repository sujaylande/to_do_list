const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');


async function getFare(pickup, destination) {
    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTimes = await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        truck: 30,
        car: 50,
        scooter: 20,
    };

    const perKmRate = {
        truck: 10,
        car: 15,
        scooter: 8,
    };

    const perMinuteRate = {
        truck: 2,
        car: 3,
        scooter: 1.5,
    };

    const fare = {};

    for (const vehicleType of Object.keys(distanceTimes)) {
        // Extract distance in km and duration in minutes
        const distanceInKm = parseFloat(distanceTimes[vehicleType].distance.replace(' km', ''));
        const durationParts = distanceTimes[vehicleType].duration.match(/(\d+) hours and (\d+) minutes/);

        const durationInMinutes = durationParts 
            ? parseInt(durationParts[1]) * 60 + parseInt(durationParts[2])
            : 0;

        fare[vehicleType] = Math.round(
            baseFare[vehicleType] +
            (distanceInKm * perKmRate[vehicleType]) +
            (durationInMinutes * perMinuteRate[vehicleType])
        );
        
    }

    const updatedDistanceTimes = {
        car: distanceTimes.car,
        moto: distanceTimes.scooter,
        auto: distanceTimes.truck
    };

    const updatedFare = {
        car: fare.car,
        moto: fare.scooter,
        auto: fare.truck
    };


    return { fare: updatedFare , durationInMinutes: updatedDistanceTimes };
}


module.exports.getFare = getFare;


function getOtp(num) {
    function generateOtp(num) {
        const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
        return otp;
    }
    return generateOtp(num);
}


module.exports.createRide = async ({
    user, pickup, destination, vehicleType
}) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error('All fields are required');
    }

    const {fare} = await getFare(pickup, destination);

    const ride = rideModel.create({
        user,
        pickup,
        destination,
        otp: getOtp(6),
        fare: fare[ vehicleType ]
    })

    return ride;
}

module.exports.confirmRide = async ({
    rideId, captain
}) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }
    
    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'accepted',
        captain: captain._id
    })

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    return ride;

}

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    if (ride.otp !== otp) {
        throw new Error('Invalid OTP');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'ongoing'
    })

    return ride;
}

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'ongoing') {
        throw new Error('Ride not ongoing');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'completed'
    })

    return ride;
}


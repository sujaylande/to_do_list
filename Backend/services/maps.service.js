const axios = require('axios');
const captainModel = require('../models/captain.model');
const mapService = require('./maps.service');


module.exports.getAddressCoordinate = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;

    try {
        const response = await axios.get(url);
        if (response.data.length > 0) {
            const location = response.data[0];
            return {
                ltd: parseFloat(location.lat),
                lng: parseFloat(location.lon)
            };
        } else {
            throw new Error('Unable to fetch coordinates');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}


module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const vehicleProfiles = ['car', 'scooter', 'truck'];
    const results = {};

    try {
        const originCoords = await mapService.getAddressCoordinate(origin);
        const destinationCoords = await mapService.getAddressCoordinate(destination);

        const originLatLng = `${originCoords.ltd},${originCoords.lng}`;
        const destinationLatLng = `${destinationCoords.ltd},${destinationCoords.lng}`;

        for (const profile of vehicleProfiles) {
            const url = `https://graphhopper.com/api/1/route?point=${originLatLng}&point=${destinationLatLng}&profile=${profile}&locale=en&calc_points=false&key=${process.env.GRAPH_HOPPER_API_KEY}`;

            try {
                const response = await axios.get(url);

                if (response.data.paths && response.data.paths.length > 0) {
                    const path = response.data.paths[0];

                    const durationInMinutes = path.time / 60000;
                    const hours = Math.floor(durationInMinutes / 60);
                    const minutes = Math.round(durationInMinutes % 60);

                    results[profile] = {
                        distance: (path.distance / 1000).toFixed(2) + " km", // Distance in kilometers with 2 decimal places
                        duration: `${hours} hours and ${minutes} minutes`
                    };
                } else {
                    results[profile] = {
                        distance: "0.00 km",
                        duration: "0 hours and 0 minutes"
                    };
                }
            } catch (error) {
                console.error(`Error fetching route for ${profile}:`, error);
                results[profile] = { distance: "0.00 km", duration: "0 hours and 0 minutes" };
            }
        } 

        return results;
    } catch (error) {
        console.error(error);
        throw error;
    }
};


module.exports.getAutoCompleteSuggestions = async (input) => {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(input)}`;

    try {
        const response = await axios.get(url);
        return response.data.features.map(feature => feature.properties.name);
    } catch (err) {
        console.error(err);
        throw err;
    }
}


module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {

    // radius in km

    const captains = await captainModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [ [ ltd, lng ], radius / 6371 ]
            }
        }
    });

    return captains;


}
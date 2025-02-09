const mapService = require('../services/maps.service');
const { validationResult } = require('express-validator');
const axios = require('axios');


module.exports.getCoordinates = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


    const { address } = req.query;

    try {
        const coordinates = await mapService.getAddressCoordinate(address);
        res.status(200).json(coordinates);
    } catch (error) {
        res.status(404).json({ message: 'Coordinates not found' });
    }
}

module.exports.getDistanceTime = async (req, res, next) => {

    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { origin, destination } = req.query;

        console.log("controoler");
        console.log(origin, destination);

        const distanceTime = await mapService.getDistanceTime(origin, destination);

        res.status(200).json(distanceTime);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.getAutoCompleteSuggestions = async (req, res, next) => {

    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { input } = req.query;

        const suggestions = await mapService.getAutoCompleteSuggestions(input);

        res.status(200).json(suggestions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}


module.exports.getLocationString = async (req, res) => {
  try {
    const { ltd, lng } = req.body;

    // Validate input
    if (typeof ltd !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: "Invalid latitude or longitude" });
    }

    // Use Nominatim API to get address
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${ltd}&lon=${lng}&format=json`;

    const response = await axios.get(url);

    // console.log('Location response:', response.data);

    if (response.data && response.data.display_name) {
      return res.status(200).json({ location: response.data.display_name });
    } else {
      return res.status(404).json({ message: 'Location not found' });
    }
  } catch (error) {
    console.error('Error fetching location:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

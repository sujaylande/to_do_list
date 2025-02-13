const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blackListTokenModel = require('../models/blackListToken.model');
const { validationResult } = require('express-validator');
const paymentModel = require('../models/payment.model');
const getDataUri = require('../config/dataURI.config');
const s3 = require('../config/aws.config');


module.exports.registerCaptain = async (req, res, next) => {

    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     return res.status(400).json({ errors: errors.array() });
    // }

    const { firstname, lastname, email, password, phoneNumber, vehicleColor, vehiclePlate, vehicleCapacity, vehicleType } = req.body;

    console.log("phone", phoneNumber);

    const isCaptainAlreadyExist = await captainModel.findOne({ email });
    const CaptainAlreadyExist = await captainModel.findOne({ phoneNumber });


    if (isCaptainAlreadyExist || CaptainAlreadyExist) {
        return res.status(400).json({ message: 'Captain already exist' });
    }


    const hashedPassword = await captainModel.hashPassword(password);

    const file = req.file;

    let s3Response;
        if (file) {
            const fileUri = getDataUri(req.file);

            const s3Params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `image/${req.file.originalname}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
              };
        
              s3Response = await s3.upload(s3Params).promise();
        }

    const captain = await captainService.createCaptain({
        firstname: firstname,
        lastname: lastname,
        email,
        password: hashedPassword,
        color: vehicleColor,
        plate: vehiclePlate,
        capacity: vehicleCapacity,
        vehicleType: vehicleType,
        phoneNumber,
        profilePicture: s3Response.Location
    });

    // Payment cycle setup upon registration
    const billingStartDate = new Date();
    const billingEndDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000); // 28 days later

    // Create payment record for captain
    await paymentModel.create({
      captainID: captain._id,
      earnings: 0,
      paymentDue: 0,
      billingStartDate,
      billingEndDate,
      isBlocked: false
    });


    const token = captain.generateAuthToken();

    res.status(201).json({ token, captain });

}

module.exports.loginCaptain = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const captain = await captainModel.findOne({ email }).select('+password');

    if (!captain) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await captain.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    //update captian status as active
    captain.status = 'active';
    await captain.save();

    const token = captain.generateAuthToken();

    res.cookie('token', token);


    if (captain.isBlocked) {
        return res.status(201).json({ token, captain, message: "Payment due. Please clear your dues to access rides." });
      }

    res.status(200).json({ token, captain });
}

module.exports.getCaptainProfile = async (req, res, next) => {
    res.status(200).json({ captain: req.captain });
}

module.exports.logoutCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    //update captian status as inactive
    req.captain.status = 'inactive';
    await req.captain.save();
    
    res.clearCookie('token');

    res.status(200).json({ message: 'Logout successfully' });
}
const paymentController = require('../controllers/payment.controller');
const express = require('express');
const router = express.Router();
const { query } = require("express-validator")
const authMiddleware = require('../middlewares/auth.middleware');

// router.get("/payment/:captainID", paymentController.getPaymentDetails);

router.get('/:captainID',
    authMiddleware.authCaptain,
    query('rideId').isMongoId().withMessage('Invalid captain id'),
    paymentController.getPaymentDetails
)

module.exports = router;


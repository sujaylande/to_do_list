const paymentController = require('../controllers/payment.controller');
const express = require('express');
const router = express.Router();
const { body, query } = require("express-validator")
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/:captainID',
    authMiddleware.authCaptain,
    query('rideId').isMongoId().withMessage('Invalid captain id'),
    paymentController.getPaymentDetails
)

router.post('/makePayment',
    authMiddleware.authCaptain,
    body('data.name').isString().withMessage('Invalid name'),
    body('data.email').isEmail().withMessage('Invalid email'),
    body('phoneNumber').isLength({ min: 10, max: 10 }).withMessage('Phone number must be exactly 10 digits long'),
    body('data.amount').isNumeric().withMessage('Invalid amount'),
    body('data.MUID').isString().withMessage('Invalid MUID'),
    body('data.transactionId').isString().withMessage('Invalid transaction ID'),
    paymentController.makePayment
)

router.post('/status',
    // authMiddleware.authCaptain,
    query('id').isString().withMessage('Invalid transaction ID'),
    query('cId').isString().withMessage('Invalid captain ID'),
    paymentController.paymentStatus
)

module.exports = router;


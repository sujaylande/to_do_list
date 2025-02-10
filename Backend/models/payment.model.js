const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  captainID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "captain",
    required: true,
  },
  earnings: {
    type: Number,
    default: 0,
  },
  billingStartDate: {
    type: Date,
    required: true,
  },
  billingEndDate: {
    type: Date,
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;

const Payment = require("../models/payment.model");

// Get payment details by Captain ID
exports.getPaymentDetails = async (req, res) => {
  try {
    const { captainID } = req.params;
    const payment = await Payment.findOne({ captainID });

    if (!payment) {
      return res.status(404).json({ message: "Payment details not found" });
    }

    res.status(200).json({
      earnings: payment.earnings,
      paymentDue: (payment.earnings)*(0.01), // 1% of earnings
      lastPaymentDate: payment.billingStartDate,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

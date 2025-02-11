const Payment = require("../models/payment.model");
const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const captainModel = require("../models/captain.model");

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
      paymentDue: payment.earnings * 0.01, // 1% of earnings
      lastPaymentDate: payment.billingStartDate,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Make payment

exports.makePayment = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    const { name, email, phone, amount, MUID, transactionId } = req.body;

    //conver id object to string
    const captainId = req.captain._id.toString();


    
    console.log("Make payment request captian id:", captainId);

    const redirectUrl= process.env.REDIRECT_URL + `${transactionId}` + `&cId=` + `${captainId}`;

    console.log("Redirect URL:", redirectUrl);

    const data = {
      merchantId: process.env.MERCHANT_ID,
      merchantTransactionId: transactionId,
      name: name,
      amount: amount * 100, // Convert to paise
      redirectUrl: redirectUrl,
      redirectMode: "POST",
      mobailNumber: phone,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const keyIndex = 1;

    const payload = JSON.stringify(data);
    const payload64 = Buffer.from(payload).toString("base64");

    const stringValue = payload64 + "/pg/v1/pay" + process.env.SALT_KEY;

    const hash256 = crypto
      .createHash("sha256")
      .update(stringValue)
      .digest("hex");

    const checksum = hash256 + "###" + keyIndex;

    const options = {
      method: "POST",
      url: process.env.TEST_URL,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-VERIFY": checksum,
        Authorization: `O-Bearer ${token}`,
      },
      data: {
        request: payload64,
      },
    };

    const response = await axios(options);

    if (response.data.success === true) {
      res
        .status(200)
        .json({ response: response.data, message: "Payment successful" });
    } else {
      res
        .status(400)
        .json({ response: response.data, message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error making payment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get payment status

exports.paymentStatus = async (req, res) => {
  console.log("Payment status request:", req.query.id);
  try {
    const  transactionId = req.query.id;
    const captainId = req.query.cId;
    
    const merchantId = process.env.MERCHANT_ID;
    const keyIndex = 1;

    console.log("Payment status request: captian id", captainId);
    console.log(req.query);

    const stringValue =
      `/pg/v1/status/${merchantId}/${transactionId}` + process.env.SALT_KEY;
    const hash256 = crypto
      .createHash("sha256")
      .update(stringValue)
      .digest("hex");
    const checksum = hash256 + "###" + keyIndex;

    const options = {
      method: "GET",
      url: process.env.TEST_URL_STATUS + `${merchantId}/${transactionId}`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": merchantId,
      },
    };

    await axios(options)
      .then(async (response) => {
        if (response.data.success === true) {
          console.log("Payment status success:", response.data);

          // Update payment status in the database

          await Payment.findOneAndUpdate(
            { captainID: captainId },
            {
              isBlocked: false,
              billingStartDate: new Date(),
              billingEndDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
              earnings: 0, // Reset earnings for the new billing cycle
            },
            { new: true }
          );

          await captainModel.findByIdAndUpdate(captainId, {
            isBlocked: false,
          });

          const url = "https://r5wl2btf-5173.asse.devtunnels.ms/captain-home";
          return res.redirect(url);
        } else {
          console.log("Payment status failed:", response.data);
          const url =
            "https://r5wl2btf-5173.asse.devtunnels.ms/captain-payment";
          return res.redirect(url);
        }
      })
      .catch((error) => {
        console.error("Error fetching payment status:", error);
        res.status(400).json({ message: "Payment status failed" });
      });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

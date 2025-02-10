import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { CaptainDataContext } from '../context/CapatainContext'


const CaptainPayment = () => {
    const { captain } = useContext(CaptainDataContext)

  const [paymentDetails, setPaymentDetails] = useState({
    earnings: 0,
    paymentDue: 0,
    lastPaymentDate: "",
  });

  // Fetch payment details on component mount
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      const token = localStorage.getItem('token')

      console.log("captain", captain)
      console.log("token", token)

      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/payment/${captain?._id}`, {
          headers: {
              Authorization: `Bearer ${token}`
          }
      });
        setPaymentDetails(response.data);
      } catch (error) {
        console.error("Error fetching payment details:", error);
      }
    };

    fetchPaymentDetails();
  }, [captain?._id]);

  const handlePayment = () => {
    // Payment logic to be added later
    console.log("Handle payment logic here");
  };

  return (
    <div className="p-4 border rounded-md shadow-md w-80 bg-white">
      <h2 className="text-xl font-bold mb-4">Captain Payment Details</h2>
      <div className="text-sm mb-2">
        <strong>Earnings This Month:</strong> ₹{paymentDetails.earnings}
      </div>
      <div className="text-sm mb-2">
        <strong>Payment Due:</strong> ₹{paymentDetails.paymentDue}
      </div>
      <div className={"text-sm mb-4"}>
        <strong>Last payment Date:</strong> {paymentDetails.lastPaymentDate}
      </div>
      <button
        onClick={handlePayment}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
      >
        Pay Now
      </button>
    </div>
  );
};

export default CaptainPayment;

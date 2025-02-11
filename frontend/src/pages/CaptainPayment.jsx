import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { CaptainDataContext } from '../context/CapatainContext'
import { useNavigate } from 'react-router-dom'



const CaptainPayment = () => {
    const { captain } = useContext(CaptainDataContext)
    const [loading, setLoading] = useState(false) 
    const navigate = useNavigate()

  const [paymentDetails, setPaymentDetails] = useState({
    earnings: 0,
    paymentDue: 0,
    lastPaymentDate: "",
  });

  // Fetch payment details on component mount
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      const token = localStorage.getItem('token')

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

  const handlePayment = async (e) => {
    // Payment logic to be added later

    e.preventDefault();
    setLoading(true);


    const data = {
      name: captain.name,
      email: captain.email,
      phone: captain.phoneNumber,
      amount: paymentDetails.paymentDue,
      MUID: "MUIW" + Date.now(),
      transactionId: "T" + Date.now(),
    }

    console.log("helo")

    // Make payment request at payment/makePayment
    const token = localStorage.getItem('token')
    try {
      await axios.post(`${import.meta.env.VITE_BASE_URL}/payment/makePayment`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then((response) => {
    
        if (response.status === 200) {
          const redirectUrl = response?.data?.response?.data?.instrumentResponse?.redirectInfo?.url;
          // data.instrumentResponse.redirectInfo.url
          
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            alert("Redirect URL missing in the payment response");
            setLoading(false);
            navigate("/captain-payment");
          }
        } else {
          alert("Payment failed");
          setLoading(false);
          navigate("/captain-payment");
        }
      });
    } catch (error) {
      console.error("Error making payment:", error);
    }
    
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
      className={`w-full py-2 rounded-md transition duration-300
        ${loading 
          ? 'bg-blue-300 text-gray-500 cursor-not-allowed' // Disabled styles
          : 'bg-blue-500 hover:bg-blue-600 text-white' // Normal styles
        }`}
      disabled={loading} // Disable the button while processing
    >
      {loading ? 'Processing...' : 'Pay Now'}
    </button>

      {/* <button
        onClick={handlePayment}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
      >
        Pay Now
      </button> */}
    </div>
  );
};

export default CaptainPayment;

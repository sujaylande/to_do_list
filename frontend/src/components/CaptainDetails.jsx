
import React, { useContext, useEffect, useState } from 'react'
import { CaptainDataContext } from '../context/CapatainContext'
import axios from 'axios'

const CaptainDetails = () => {

    const { captain } = useContext(CaptainDataContext)
    const [earnings, setEarnings] = useState(0);

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
        setEarnings(response.data.earnings);
      } catch (error) {
        console.error("Error fetching payment details:", error);
      }
    };

    fetchPaymentDetails();
  }, [captain?._id]);

    return (
        <div>
            <div className='flex items-center justify-between'>
                <div className='flex items-center justify-start gap-3'>
                <img className='h-10 w-10 rounded-full object-cover' src={captain.profilePicture} alt="Captain Profile" />                    <h4 className='text-lg font-medium capitalize'>{captain?.fullname?.firstname + " " + captain?.fullname?.lastname}</h4>
                </div>
                <div>
                    <h4 className='text-xl font-semibold'>₹{earnings}</h4>
                    <p className='text-sm text-gray-600'>Earned</p>
                </div>
            </div>
            <div className='flex p-3 mt-8 bg-gray-100 rounded-xl justify-center gap-5 items-start'>
                <div className='text-center'>
                    <i className="text-3xl mb-2 font-thin ri-booklet-line"></i>
                    <h5 className='text-lg font-medium'>{earnings*(0.01)}</h5>
                    <p className='text-sm text-gray-600'>Fees Due</p>
                </div>
                <div className='text-center'>
                    <i className="text-3xl mb-2 font-thin ri-speed-up-line"></i>
                    <h5 className='text-lg font-medium'>{Math.floor((captain?.drivingHours)/60)}</h5>
                    <p className='text-sm text-gray-600'>Hours Driving</p>
                </div>
                <div className='text-center'>
                    <i className="text-3xl mb-2 font-thin ri-timer-2-line"></i>
                    <h5 className='text-lg font-medium'>{captain?.drivingKM}</h5>
                    <p className='text-sm text-gray-600'>KM Driving</p>
                </div>

            </div>
        </div>
    )
}

export default CaptainDetails
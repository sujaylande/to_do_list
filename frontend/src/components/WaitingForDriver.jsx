import React from 'react'
import axios from 'axios'

const WaitingForDriver = (props) => {


  const cancelRide = async () => {

    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/rides/cancel-ride-byuser`,
      {
        params: {
          rideId: props.ride._id,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (response.status === 200) {
      console.log("Ride Cancelled by user")
      props.setWaitingForDriver(false)
      props.setVehicleFound(false)
    }
  };

  return (
    <div>
      {/* <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
        props.waitingForDriver(false)
      }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5> */}

      <div className='flex items-center justify-between'>
        <img className='h-12' src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg" alt="" />
        <div className='text-right'>
          <h2 className='text-lg font-medium capitalize'>{props.ride?.captain.fullname.firstname}</h2>
          <h2 className='text-lg font-medium capitalize'>{props.ride?.captain.phoneNumber}</h2>
          <h4 className='text-xl font-semibold -mt-1 -mb-1'>{props.ride?.captain.vehicle.plate}</h4>
          <h1 className='text-lg font-semibold'>  {props.ride?.otp} </h1>
        </div>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full mt-5'>
          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="ri-map-pin-user-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Pickup</h3>
              <p className='text-sm -mt-1 text-gray-600'>{props.ride?.pickup}</p>
            </div>
          </div>
          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Destination</h3>
              <p className='text-sm -mt-1 text-gray-600'>{props.ride?.destination}</p>
            </div>
          </div>
          <div className='flex items-center gap-5 p-3'>
            <i className="ri-currency-line"></i>
            <div>
              <h3 className='text-lg font-medium'>₹{props.ride?.fare} </h3>
              <p className='text-sm -mt-1 text-gray-600'>Ride Fare</p>
            </div>
          </div>

          <div className='flex items-center gap-5 p-3'>
            <div>
            <button
              onClick={() => {
                cancelRide();
              }}
              className="w-full mt-2 bg-red-600 text-lg text-white font-semibold p-3 rounded-lg active:bg-red-500"
            >
              Cancel Ride
            </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default WaitingForDriver
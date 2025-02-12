import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { CaptainDataContext } from "../context/CapatainContext";

const RidePopUp = (props) => {
  const { captain } = useContext(CaptainDataContext);
  const [isFirstInQueue, setIsFirstInQueue] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  console.log("RidePopUp:", props.ride?.user);

  const vehicle = captain?.vehicle?.vehicleType;

  const acceptRide = async (ride) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/rides/accept`,
        {
          rideId: ride?._id,
          captainId: captain?._id,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (error) {
      console.error("Error accepting the ride:", error);
    }
  };

  const handleAcceptRide = async (ride) => {
    setIsAccepting(true); // Disable the button immediately

    // Accept the ride first
    acceptRide(ride);

    // Wait for 10 seconds before checking if the captain is first in the queue
    setTimeout(async () => {
      try {
        const isFirstInQueueResponse = await checkIfFirstInQueue(ride);

        if (isFirstInQueueResponse) {
          props.setConfirmRidePopupPanel(true);
          props.confirmRide();
        } else {
          alert("Another captain has already accepted this ride.");
          props.setConfirmRidePopupPanel(false);
        }
      } catch (error) {
        console.error("Error during queue check:", error);
      }
    }, 10000);
  };

  const checkIfFirstInQueue = async (ride) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/rides/is-first-in-queue`,
        {
          params: {
            rideId: ride?._id,
            captainId: captain?._id,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return response.data.isFirstInQueue;
    } catch (error) {
      console.error("Error checking queue position:", error);
      return false;
    }
  };


  return (
    <div>
      {/* Ride Popup UI */}
      <h5
        className="p-1 text-center w-[93%] absolute top-0"
        onClick={() => props.setRidePopupPanel(false)}
      >
        <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
      </h5>
      <h3 className="text-2xl font-semibold mb-5">New Ride Available!</h3>
      {/* Ride Details */}
      <div className="flex items-center justify-between p-3 bg-yellow-400 rounded-lg mt-4">
        <div className="flex items-center gap-3">
          <img
            className="h-12 rounded-full object-cover w-12"
            src={props.ride?.user.profilePicture}
            alt=""
          />
          <h2 className="text-lg font-medium"> 
            {props.ride?.user.fullname.firstname +
              " " +
              props.ride?.user.fullname.lastname}
          </h2>
        </div>
      </div>


      <div className="flex items-center justify-between p-3 bg-yellow-400 rounded-lg mt-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium"> 
          <div className="ride-details">
  <div className="flex items-center"> {/* Use flexbox */}
    <h5 className="text-lg font-semibold">Pickup:</h5>
    <span className="ml-2">{props?.ride?.pickup}</span> {/* Margin for spacing */}
  </div>
    <div className="flex items-center"> {/* Use flexbox */}
    <h5 className="text-lg font-semibold">Destination:</h5>
    <span className="ml-2">{props?.ride?.destination}</span> {/* Margin for spacing */}
  </div>
</div>
          </h2>
        </div>
      </div>


      <div className="flex items-center justify-between p-3 bg-yellow-400 rounded-lg mt-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium"> 
          {props?.pickupAndCaptainDistace ? (
          <div>
            <h5 className="text-lg font-semibold">
              {props?.pickupAndCaptainDistace[vehicle].distance || "N/A"}
            </h5>
            <h5 className="text-lg font-semibold">
              {props?.pickupAndCaptainDistace[vehicle].duration || "N/A"}
            </h5>
          </div>
        ) : (
          <div>
            <h5 className="text-lg font-semibold">
              {props?.pickupAndCaptainDistace || "Fetching..."}
            </h5>
            <h5 className="text-lg font-semibold">
              {props?.pickupAndCaptainDistace || "Fetching..."}
            </h5>
          </div>
        )} Away from you!
          </h2>
        </div>
      </div>

      <div className="flex gap-2 justify-between flex-col items-center">
        <div className="w-full mt-5">
          <button
            onClick={() => handleAcceptRide(props.ride)}
            className={`w-full text-white font-semibold p-2 px-10 rounded-lg 
                       ${
                         isAccepting
                           ? "bg-green-400 cursor-not-allowed"
                           : "bg-green-600 hover:bg-green-700"
                       }`} // Conditional styling
            disabled={isAccepting} // Disable the button while accepting
          >
            {isAccepting ? "Wait..." : "Accept"}
          </button>

          <button
            onClick={() => props.setRidePopupPanel(false)}
            className="mt-2 w-full bg-gray-300 text-gray-700 font-semibold p-2 px-10 rounded-lg"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
};

export default RidePopUp;

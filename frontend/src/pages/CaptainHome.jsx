import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'
import RidePopUp from '../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ConfirmRidePopUp from '../components/ConfirmRidePopUp'
import { useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { CaptainDataContext } from '../context/CapatainContext'
import axios from 'axios'
import LiveTracking from '../components/LiveTracking'
import { use } from 'react'

const CaptainHome = () => {

    const [ ridePopupPanel, setRidePopupPanel ] = useState(false)
    const [ confirmRidePopupPanel, setConfirmRidePopupPanel ] = useState(false)

    const ridePopupPanelRef = useRef(null)
    const confirmRidePopupPanelRef = useRef(null)
    const [ ride, setRide ] = useState(null)

    const { socket } = useContext(SocketContext)
    const { captain } = useContext(CaptainDataContext)

    const [pickupAndCaptainDistace, setPickupAndCaptainDistace] = useState(null);
    const [myPickupLocation, setMyPickupLocation] = useState(null);


    useEffect(() => {

        socket.emit('join', {
            userId: captain?._id,
            userType: 'captain'
        })
        const updateLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {

                    socket.emit('update-location-captain', {
                        userId: captain?._id,
                        location: {
                            ltd: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    })
                })
            }
        }

        const locationInterval = setInterval(updateLocation, 10000*6) // 1 min
        updateLocation()

        // return () => clearInterval(locationInterval)
    }, [])

    // socket.on('new-ride', (data) => {

    //     setRide(data)
    //     setRidePopupPanel(true)

    // })

    socket.on('new-ride', (data) => { // new code
        setRide(data);
        setMyPickupLocation(data.pickup)

        setRidePopupPanel(true);
    
        setTimeout(() => {
            setRidePopupPanel(false);
        }, 15000); // 10000 milliseconds = 10 seconds
    });

    useEffect(() => {
        findDistacePickAndCaptain();
    }, [myPickupLocation]);


    async function findDistacePickAndCaptain() {
        try {
          console.log("Finding distance and duration between pickup and captain location...");
          // Step 1: Get Captain's location as a string from coordinates
          const myLocationResponse = await axios.post(
            `${import.meta.env.VITE_BASE_URL}/maps/get-location-string`,
            {
              ltd: captain?.location.ltd,
              lng: captain?.location.lng
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
      
          const myLocationString = myLocationResponse.data.location;
    
          console.log("My Location:", myLocationString);
      
          if (!myLocationString) {
            console.error("Failed to fetch captain's location as a string");
            return;
          }

          console.log("ride pickuppp", ride?.pickup);
      
          // Step 2: Get distance and duration between pickup and captain location
          if(myPickupLocation){
            const response = await axios.get(
                `${import.meta.env.VITE_BASE_URL}/rides/get-fare`,
                {
                  params: { pickup: ride?.pickup, destination: myLocationString },
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }
                }
              );
          
              console.log("Distance and Duration:", response.data);
              setPickupAndCaptainDistace(response.data.durationInMinutes);
          }
      
        } catch (error) {
          console.error("Error in finding distance and duration:", error);
        }
      }
    

    async function confirmRide() {


        const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/confirm`, {

            rideId: ride?._id,
            captainId: captain?._id,


        }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })

        setRidePopupPanel(false)

        //otp component will be shown if he is the first in queue otherwise not 
        setConfirmRidePopupPanel(true)

    }


    useGSAP(function () {
        if (ridePopupPanel) {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ ridePopupPanel ])

    useGSAP(function () {
        if (confirmRidePopupPanel) {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ confirmRidePopupPanel ])


    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="fixed p-6 top-0 flex items-center justify-between w-screen bg-white z-10">
                <img
                    className="w-16"
                    src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
                    alt=""
                />

                <Link
                    to="/captain-home"
                    className="h-10 w-10 bg-white flex items-center justify-center rounded-full shadow"
                >
                    <i className="text-lg font-medium ri-logout-box-r-line"></i>
                </Link>
            </div>
    
            {/* Map Section */}
            <div className="flex-grow mt-[72px]">
                <LiveTracking />
            </div>
    
            {/* Captain Details */}
            <div className="bg-white px-6 py-4">
                <CaptainDetails />
            </div>
    
            {/* Ride Popup */}
            <div
                ref={ridePopupPanelRef}
                className="fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12"
            >
                <RidePopUp
                    ride={ride}
                    setRidePopupPanel={setRidePopupPanel}
                    setConfirmRidePopupPanel={setConfirmRidePopupPanel}
                    confirmRide={confirmRide}
                    pickupAndCaptainDistace={pickupAndCaptainDistace}
                />
            </div>
    
            {/* Confirm Ride Popup */}
            <div
                ref={confirmRidePopupPanelRef}
                className="fixed w-full h-screen z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12"
            >
                <ConfirmRidePopUp
                    ride={ride}
                    setConfirmRidePopupPanel={setConfirmRidePopupPanel}
                    setRidePopupPanel={setRidePopupPanel}
                />
            </div>
        </div>
    );
    
    
}

export default CaptainHome
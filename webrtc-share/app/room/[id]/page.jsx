"use client"
import { Button } from '@/components/ui/button'
import React, { useState, use, useRef, useEffect } from 'react'
import { PhoneCall, Monitor, Video } from 'lucide-react'
import { DialogComponent } from '@/components/dialogs/DialogCompnent'
import Image from 'next/image'
import useWebRTC from '@/hooks/useWebRTC'
import { io } from "socket.io-client"
import { useSearchParams } from 'next/navigation'

const page = ({params}) => {
  const {id} = use(params);
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const [profileData, setProfileData] = useState({});
  const videoRef = useRef(null);
  const notificationSocketRef = useRef(null);
  const {localStream, remoteStream, socket, socketConnection, handleDisconnect, startPeerConnection} = useWebRTC(false, id, videoRef);
  
  // Extract profile data from URL parameters
  useEffect(() => {
    try {
      const landlordName = searchParams.get('landlordName');
      const profileImage = searchParams.get('profileImage');
      const landlordLogo = searchParams.get('landlordLogo');
      
      console.log('👤 Room [id] loaded with profile data:', {
        id: id,
        landlordName: landlordName,
        hasProfileImage: !!profileImage,
        hasLandlordLogo: !!landlordLogo
      });
      
      setProfileData({
        landlordName: landlordName,
        profileImage: profileImage,
        landlordLogo: landlordLogo
      });
    } catch (error) {
      console.error('Error extracting profile data:', error);
      setProfileData({
        landlordName: null,
        profileImage: null,
        landlordLogo: null
      });
    }
  }, [searchParams, id]);
  
  // Notify admin when user opens the link
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const socketUrl = backendUrl.replace('/api/v1', '');
    
    // Create separate socket for notifications
    notificationSocketRef.current = io(socketUrl, {
      reconnectionAttempts: 3,
      timeout: 5000,
      transports: ['websocket'],
    });

    notificationSocketRef.current.on('connect', () => {
      console.log('📡 Room notification socket connected');
      // Notify that user has opened this room
      notificationSocketRef.current.emit('user-opened-link', id);
    });

    return () => {
      if (notificationSocketRef.current) {
        notificationSocketRef.current.disconnect();
      }
    };
  }, [id]);
  
  const handleStrt = () => {
    try {
      setOpen(false);
      startPeerConnection();
      
      // Notify admin that user has accepted and started the session
      if (notificationSocketRef.current) {
        notificationSocketRef.current.emit('user-started-session', id);
      }
    } catch (error) {
      console.error('Error starting peer connection:', error);
    }
  }

  return (
    <>
      <div className='w-[100vw] h-[100vh] relative overflow-hidden'>
        <video ref={videoRef} autoPlay className="w-full h-full object-cover absolute top-0 left-0" />

        {
          !open && (
            <Button onClick={handleDisconnect} className='absolute bottom-40 right-[50%] translate-x-[50%] text-white bg-red-400 rounded-md hover:bg-red-600 cursor-pointer text-xl'>
              End Video Call
            </Button>
          )
        }
      </div>

      <DialogComponent open={open} setOpen={setOpen}>
        <div className="max-h-[85vh] w-[350px] p-3 flex flex-col items-center justify-center gap-3 overflow-y-auto pb-6">
          
          {/* Paper Plane Image - Always show */}
          <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain pb-4 pt-2' width={150} height={150} />

          {/* Landlord Logo - Show below paper plane if available */}
          {profileData.landlordLogo && (
            <div className="flex justify-center -mt-2 pt-3">
              <img 
                src={profileData.landlordLogo} 
                alt="Landlord Logo" 
                className="max-h-12 max-w-[150px] object-contain" 
                onError={(e) => {
                  console.error('Failed to load landlord logo:', profileData.landlordLogo);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('✅ Landlord logo loaded successfully in room [id]');
                }}
              />
            </div>
          )}

          {/* Landlord Name or Videodesk Default */}
          <h2 className="text-xl font-bold mt-2 text-center pb-3">
            {profileData.landlordName ? (
              <span className="text-xl font-bold">{profileData.landlordName}</span>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Video className="w-6 h-6 text-gray-700" />
                <span className="text-xl font-bold">Videodesk</span>
              </div>
            )}
          </h2>

          <button className='bg-green-600 hover:bg-green-700 text-white font-medium py-3 cursor-pointer rounded-full mt-4 text-lg w-[90%] outline-none transition-colors' onClick={handleStrt}>
            Tap to allow video <br/> session now
          </button>

          {/* Device Icons - moved up */}
          <img src="/device-icons.png" alt="Videodesk" className="w-30 mt-2" />

          {/* Videodesk Heading - moved down */}
          <h3 className="text-2xl font-bold text-black pt-6 pb-6">Videodesk</h3>
        </div>
      </DialogComponent>
    </>
  )
}

export default page
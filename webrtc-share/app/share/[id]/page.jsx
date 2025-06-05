"use client"
import { useState, useRef, use, useEffect } from "react"
import { VideoIcon, PlayIcon, Minimize2, Expand, ZoomIn, ZoomOut } from "lucide-react"
import { getMeetingByMeetingId } from "@/http/meetingHttp"
import { recordVisitorAccessRequest } from "@/http/meetingHttp"
import { useDialog } from "@/provider/DilogsProvider"
import { toast } from "sonner"

export default function SharePage({ params }) {
  const { id } = use(params);
  const { openVisitorAccessModal } = useDialog();
  
  const [targetTime, setTargetTime] = useState("Emergency 24 Hours")
  const [residentName, setResidentName] = useState("")
  const [residentAddress, setResidentAddress] = useState("")
  const [postCode, setPostCode] = useState("")
  const [repairDetails, setRepairDetails] = useState("")
  
  // Meeting data states
  const [meetingData, setMeetingData] = useState(null);
  const [isLoadingMeetingData, setIsLoadingMeetingData] = useState(true);
  const [recordings, setRecordings] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [playingVideos, setPlayingVideos] = useState(new Set());
  const [accessGranted, setAccessGranted] = useState(false);

  // Format recording duration
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to handle visitor access
  const handleVisitorAccess = async (visitorData) => {
    try {
      console.log('🔐 Recording visitor access for meeting:', id);
      const response = await recordVisitorAccessRequest(id, visitorData);
      
      if (response.success) {
        setAccessGranted(true);
        console.log('✅ Visitor access recorded successfully');
        
        // Now fetch meeting data
        await fetchMeetingData();
      } else {
        throw new Error(response.message || 'Failed to record access');
      }
    } catch (error) {
      console.error('❌ Failed to record visitor access:', error);
      throw error;
    }
  };

  // Fetch meeting data when component mounts
  const fetchMeetingData = async () => {
    if (!id) return;
    
    setIsLoadingMeetingData(true);
    try {
      console.log('🔍 Fetching meeting data for share ID:', id);
      const response = await getMeetingByMeetingId(id);
      
      if (response.data.success && response.data.meeting) {
        const meetingData = response.data.meeting;
        console.log('✅ Found meeting data:', meetingData);
        
        // Populate form fields with existing data (read-only)
        setResidentName(meetingData.name || "");
        setResidentAddress(meetingData.address || "");
        setPostCode(meetingData.post_code || "");
        setRepairDetails(meetingData.repair_detail || "");
        setTargetTime(meetingData.target_time || "Emergency 24 Hours");
        
        // Load recordings
        if (meetingData.recordings && meetingData.recordings.length > 0) {
          const recordingsData = meetingData.recordings.map(rec => ({
            id: rec._id || Date.now() + Math.random(),
            url: rec.url,
            timestamp: new Date(rec.timestamp).toLocaleString(),
            duration: rec.duration || 0
          }));
          setRecordings(recordingsData);
        }
        
        // Load screenshots
        if (meetingData.screenshots && meetingData.screenshots.length > 0) {
          const screenshotsData = meetingData.screenshots.map(screenshot => ({
            id: screenshot._id || Date.now() + Math.random(),
            url: screenshot.url,
            timestamp: new Date(screenshot.timestamp).toLocaleString()
          }));
          setScreenshots(screenshotsData);
        }
        
        setMeetingData(meetingData);
        
        toast.success("Meeting data loaded successfully!", {
          description: `Found ${meetingData.recordings?.length || 0} recordings and ${meetingData.screenshots?.length || 0} screenshots`
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch meeting data:', error);
      toast.error("Failed to load meeting data", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoadingMeetingData(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    
    // Check if access has been granted, if not show visitor modal
    if (!accessGranted) {
      console.log('🔐 Access not granted, showing visitor modal...');
      openVisitorAccessModal(handleVisitorAccess);
    } else {
      fetchMeetingData();
    }
  }, [id, accessGranted]);

  // Show loading while waiting for access or loading data
  if (!accessGranted || isLoadingMeetingData) {
    return (
      <div className="max-w-6xl mx-auto p-4 py-10 font-sans">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">
            {!accessGranted ? "Please provide your information to access this meeting..." : "Loading meeting data..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 py-10 font-sans">
      <div className="gap-6" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr' }}>
        {/* Left Column */}
        <div className="space-y-6 flex gap-5">
          <div className="flex-1 flex flex-col gap-10">
            {/* Logo and User */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center">
                <a href="/" className="text-2xl font-bold text-gray-900 flex items-center">
                  <VideoIcon className="mr-2" />
                  <span>Videodesk.co.uk</span>
                </a>
              </div>
            </div>

            {/* User Greeting */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img
                  src="https://i.pravatar.cc/300"
                  alt="User avatar"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm text-gray-600">Shared by,</p>
                <p className="font-semibold">Sharon</p>
              </div>
            </div>

            {/* Resident Name Section */}
            <div className="">
              <label htmlFor="residentName" className="block text-lg font-medium mb-5">
                Resident Name :
              </label>
              <input
                id="residentName"
                type="text"
                value={residentName}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
            </div>

            {/* Video Recording Section */}
            <div>
              <h2 className="text-lg font-medium mb-3">Video Recording :</h2>
              <div className="grid grid-cols-2 gap-3">
                {recordings.length === 0 && (
                  <h1>No recordings</h1>
                )}
                
                {recordings.map((recording) => (
                  <div key={recording.id} className="relative group">
                    <div className="aspect-square bg-gray-200 rounded-md overflow-hidden relative">
                      <video
                        src={recording.url}
                        controls={false}
                        muted
                        className="w-full h-full object-cover"
                        onPlay={() => setPlayingVideos(prev => new Set(prev).add(recording.id))}
                        onPause={() => setPlayingVideos(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(recording.id);
                          return newSet;
                        })}
                        onClick={(e) => {
                          if (e.target.paused) {
                            e.target.play();
                          } else {
                            e.target.pause();
                          }
                        }}
                      />
                      
                      {/* Play icon */}
                      <div 
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 ${
                          playingVideos.has(recording.id) 
                            ? 'opacity-0 group-hover:opacity-60' 
                            : 'opacity-70'
                        }`}
                      >
                        <PlayIcon className="w-8 h-8 text-white/80 drop-shadow-md filter" />
                      </div>

                      {/* View controls only */}
                      <div className="absolute top-2 right-2 flex flex-row gap-1 z-10">
                        <button className="p-1 hover:bg-black/20 rounded text-white" title="Minimize">
                          <Minimize2 className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-black/20 rounded text-white" title="Maximize">
                          <Expand className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{recording.timestamp} - Duration: {formatRecordingTime(recording.duration)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Screenshot Section */}
            <div>
              <h2 className="text-lg font-medium mb-3">Image screenshot :</h2>
              <div className="grid grid-cols-2 gap-3">
                {screenshots.length === 0 && (
                  <h1>No screenshots</h1>
                )}

                {screenshots.map((screenshot, index) => (
                  <div key={screenshot.id}>
                    <img src="/icons/ci_label.svg" className="mb-2" />
                    <div className="aspect-square bg-gray-200 rounded-md flex items-center justify-center relative">
                      <div className="absolute top-2 right-2 flex flex-row gap-1 z-10">
                        <button className="p-1 hover:bg-black/20 rounded text-white">
                          <Minimize2 className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-black/20 rounded text-white">
                          <Expand className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <img
                        src={screenshot.url}
                        alt="screenshot"
                        className="w-full h-full object-cover absolute top-0 left-0 z-0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{screenshot.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Resident Information */}
          <div>
            <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">
              <div className="flex-1">
                <label htmlFor="residentAddress" className="block text-lg font-medium mb-2">
                  Resident Address :
                </label>
                <input
                  id="residentAddress"
                  type="text"
                  value={residentAddress}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                />
              </div>
            </div>
            <div className="mb-6">
              <input
                type="text"
                value={postCode}
                readOnly
                placeholder="Post code:"
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
            </div>
            <div className="mb-6">
              <input
                type="text"
                value={postCode}
                readOnly
                placeholder="Ref:"
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          {/* Repair Details */}
          <div>
            <label htmlFor="repairDetails" className="block text-lg font-medium mb-2">
              Repair details :
            </label>
            <textarea
              id="repairDetails"
              value={repairDetails}
              readOnly
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
            />
          </div>

          {/* Target Time */}
          <div className="relative">
            <label htmlFor="targetTime" className="block text-lg font-medium mb-2">
              Target time :
            </label>
            <div className="flex items-start gap-2">
              <div className="relative flex-1">
                <div className="w-full flex items-center justify-between p-3 bg-orange-100 rounded-md text-left">
                  <span>{targetTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs mt-5">
        Shared Content - Meeting ID: {id}
        {meetingData?.total_access_count && (
          <span className="ml-2 text-gray-500">
            (Accessed {meetingData.total_access_count} time{meetingData.total_access_count !== 1 ? 's' : ''})
          </span>
        )}
      </p>
    </div>
  )
}

"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2, Maximize2 } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutRequest } from "@/http/authHttp"
import { getAllMeetings, deleteMeeting, archiveMeeting, unarchiveMeeting, getArchivedCount } from "@/http/meetingHttp"
import { useUser } from "@/provider/UserProvider"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import axios from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { io } from "socket.io-client"
import { DialogComponent } from "@/components/dialogs/DialogCompnent"
import { LockIcon, XIcon } from "lucide-react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Disclosure } from "@headlessui/react";


import {
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  ClockIcon,
} from "@heroicons/react/20/solid";
import { useDialog } from "@/provider/DilogsProvider"
import CustomDialog from "@/components/dialogs/CustomDialog"
import { updateUserLogoRequest } from "@/http/authHttp"

export default function Page() {
  const { user, isAuth, setIsAuth, setUser } = useUser();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [contactMethod, setContactMethod] = useState('email');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [linkAccepted, setLinkAccepted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [viewMode, setViewMode] = useState('active'); // 'active', 'archived', 'all'
  const [archivedCount, setArchivedCount] = useState(0);

  const phoneInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const socketRef = useRef(null);

  const {setResetOpen,setMessageOpen,setLandlordDialogOpen,setTickerOpen,setInviteOpen, setFeedbackOpen, setFaqOpen, setExportOpen} = useDialog();

  useEffect(() => {
    fetchMeetings();
    fetchArchivedCount();
  }, [viewMode]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (open && token) {
      // Connect to socket when dialog opens with token
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const socketUrl = backendUrl.replace('/api/v1', '');
      
      socketRef.current = io(socketUrl, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('📡 Dashboard connected to socket');
        setSocketConnected(true);
        // Join admin room for this token
        socketRef.current.emit('admin-waiting', token);
      });

      socketRef.current.on('user-joined-room', (roomToken) => {
        console.log('✅ User opened the link:', roomToken);
        if (roomToken === token) {
          setLinkAccepted(true);
          toast.success("User has opened the video link!");
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('📡 Dashboard disconnected from socket');
        setSocketConnected(false);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [open, token]);

  // Cleanup socket on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Remove the logo upload effect since we're using landlord info
  // useEffect(() => {
  //   if (user?.logo) {
  //     setLogoImage(user.logo);
  //     console.log('📷 User logo loaded:', user.logo);
  //   }
  // }, [user]);

  useEffect(() => {
    let focusTimer;

    if (showForm && !isManualSelection) {
      focusTimer = setInterval(() => {
        const currentTime = Date.now();
        if (!isTyping && currentTime - lastTypingTime > 3000) {
          if (contactMethod === 'phone') {
            emailInputRef.current?.focus();
            setContactMethod('email');
          } else {
            phoneInputRef.current?.focus();
            setContactMethod('phone');
          }
        }
      }, 3000);
    }

    return () => {
      clearInterval(focusTimer);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [showForm, isTyping, lastTypingTime, contactMethod, isManualSelection]);

  const handleInputChange = (value, type) => {
    setIsTyping(true);
    setLastTypingTime(Date.now());
    
    if (type === 'phone') {
      setPhone(value);
      setContactMethod('phone');
    } else {
      setEmail(value);
      setContactMethod('email');
    }

    // Reset typing state after 1 second of no input
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      // Fix the archived parameter logic
      let archivedParam = null;
      if (viewMode === 'archived') {
        archivedParam = true; // Only get archived meetings
      } else if (viewMode === 'active') {
        archivedParam = false; // Only get non-archived meetings
      }
      // If viewMode is 'all', archivedParam stays null to get all meetings
      
      console.log('📋 Fetching meetings with archived param:', archivedParam, 'viewMode:', viewMode);
      const response = await getAllMeetings(archivedParam);
      setMeetings(response.data.meetings || []);
      console.log('📋 Fetched meetings:', response.data.meetings?.length || 0, 'meetings');
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast(error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedCount = async () => {
    try {
      const response = await getArchivedCount();
      setArchivedCount(response.data.archivedCount);
    } catch (error) {
      console.error('Error fetching archived count:', error);
    }
  };

  const handleArchiveMeeting = async (id, meetingName) => {
    try {
      await archiveMeeting(id);
      toast.success(`"${meetingName || 'Meeting'}" archived successfully`);
      fetchMeetings();
      fetchArchivedCount();
    } catch (error) {
      toast.error("Failed to archive meeting", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  const handleUnarchiveMeeting = async (id, meetingName) => {
    try {
      await unarchiveMeeting(id);
      toast.success(`"${meetingName || 'Meeting'}" unarchived successfully`);
      fetchMeetings();
      fetchArchivedCount();
    } catch (error) {
      toast.error("Failed to unarchive meeting", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  const handleDeleteMeeting = async (id, meetingName) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${meetingName || 'this meeting'}"?\n\nThis will permanently delete:\n• The meeting document\n• All recordings\n• All screenshots\n• All associated media files\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      console.log(`🗑️ Starting complete meeting deletion for: ${meetingName || id}`);
      const response = await deleteMeeting(id);
      
      // Show detailed success message
      if (response.data.deletion_summary) {
        const summary = response.data.deletion_summary;
        toast.success("Meeting deleted successfully", {
          description: `Deleted ${summary.recordings_total} recordings and ${summary.screenshots_total} screenshots${summary.failed_cloudinary_deletions > 0 ? `, with ${summary.failed_cloudinary_deletions} cloud storage issues` : ''}`
        });
      } else {
        toast.success("Meeting deleted successfully");
      }
      
      fetchMeetings(); // Refresh the list
    } catch (error) {
      console.error('❌ Meeting deletion failed:', error);
      toast.error("Failed to delete meeting", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  const handleLogout = async () => {
    try {
      const res = await logoutRequest();
      toast("Logout Successfull", {
        description: res.data.message
      });
      setIsAuth(false);
      setUser(null);
      router.push('../');
    } catch (error) {
      toast("Logout Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isAuth == false) {
      toast("Please Login First");
      return
    }

    setIsLoading(true);
    try {
      // Fix the backend URL to use the root server URL (not the API prefix)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Prepare profile data with proper validation
      const profileData = {
        number: phone,
        email: email
      };
      
      // Add landlord name if available and enabled
      if (user?.landlordInfo?.landlordName) {
        profileData.landlordName = user.landlordInfo.landlordName;
        console.log('📝 Adding landlord name:', user.landlordInfo.landlordName);
      }
      
      // Add landlord logo if available and enabled
      const landlordLogoUrl = getLandlordLogo();
      if (landlordLogoUrl) {
        profileData.landlordLogo = landlordLogoUrl;
        console.log('🏢 Adding landlord logo URL:', landlordLogoUrl.substring(0, 50) + '...');
      }
      
      // Add profile image if available (could be different from logo)
      const profileImageUrl = getProfileImage();
      if (profileImageUrl) {
        profileData.profileImage = profileImageUrl;
        console.log('🖼️ Adding profile image URL:', profileImageUrl.substring(0, 50) + '...');
      }
      
      console.log('📤 Final profile data summary:', {
        hasLandlordName: !!profileData.landlordName,
        hasProfileImage: !!profileData.profileImage,
        hasLandlordLogo: !!profileData.landlordLogo,
        landlordName: profileData.landlordName,
        urlsAreSame: profileData.profileImage === profileData.landlordLogo
      });
      
      // Build query string and make request to the correct endpoint
      const queryParams = new URLSearchParams();
      
      // Add required fields
      if (profileData.number) queryParams.append('number', profileData.number);
      if (profileData.email) queryParams.append('email', profileData.email);
      
      // Add optional profile fields
      if (profileData.landlordName) queryParams.append('landlordName', profileData.landlordName);
      if (profileData.landlordLogo) queryParams.append('landlordLogo', profileData.landlordLogo);
      if (profileData.profileImage) queryParams.append('profileImage', profileData.profileImage);
      
      console.log('🔗 URL will be:', `${backendUrl}/send-token?${queryParams.toString().substring(0, 150)}...`);
      
      const res = await axios.get(`${backendUrl}/send-token?${queryParams.toString()}`);
      
      setToken(res.data.token);
      setShowForm(false);
      setOpen(true);
      // Reset link acceptance status for new link
      setLinkAccepted(false);
      
      toast.success("Video link sent with your profile information!");
    } catch (error) {
      console.error('Error sending token:', error);
      toast.error("Failed to send video link. Please try again.");
    } finally {
      setIsLoading(false);
      setIsManualSelection(false);
    }
  };
  const handleSend = () => {
    // Add your logic here (e.g., API call)
    if (!phone && !email) {
      alert('Please enter a mobile number or email address.');
      return;
    }
    console.log('Sending video link to:', phone || email);
  };

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return 'U';
    
    // Split name into words and get first letter of each word (max 2)
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Helper function to check if image URL is valid/accessible
  const isValidImageUrl = (url) => {
    if (!url) return false;
    // Check if it's a data URL (base64) or a valid HTTP/HTTPS URL
    return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
  };

  // Helper function to get profile image with fallback
  const getProfileImage = () => {
    // Check if using landlord logo as profile
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      if (isValidImageUrl(user.landlordInfo.landlordLogo)) {
        return user.landlordInfo.landlordLogo;
      }
    }
    
    // Check if using officer image
    if (user?.landlordInfo?.officerImage) {
      if (isValidImageUrl(user.landlordInfo.officerImage)) {
        return user.landlordInfo.officerImage;
      }
    }
    
    // Return null to show initials instead
    return null;
  };

  // Helper function to get landlord logo
  const getLandlordLogo = () => {
    if (user?.landlordInfo?.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
      return user.landlordInfo.landlordLogo;
    }
    return null;
  };

  // Helper function to get profile shape class
  const getProfileShapeClass = () => {
    const shape = user?.landlordInfo?.profileShape;
    if (shape === 'square') {
      return 'rounded-lg';
    } else if (shape === 'circle') {
      return 'rounded-full';
    }
    return 'rounded-full'; // default
  };

  // Helper function to format date
  const formatLoginTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    
    // Array of month names
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Convert to 12-hour format with leading zero for single digit hours
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = String(hours % 12 || 12).padStart(2, '0');
    
    return `${day} ${month} ${year}, ${displayHours}.${minutes}${ampm}`;
  };

  // Helper function to get last login time with fallback logic
  const getLastLoginTime = () => {
    if (user?.previousLoginTime) {
      return formatLoginTime(user.previousLoginTime);
    } else if (user?.currentLoginTime) {
      // If no previous login, show current login time
      return formatLoginTime(user.currentLoginTime);
    }
    return 'Never';
  };

  // Helper function to get display name
  const getDisplayName = () => {
    // Extract username from email (part before @)
    if (user?.email) {
      return user.email.split('@')[0];
    }
    
    // Default fallback
    return 'User';
  };

  // Helper function to format date for display
  const formatMeetingDate = (dateString) => {
    if (!dateString) return { time: 'Unknown', date: 'Unknown' };
    const date = new Date(dateString);
    
    // Format time as "09.28 AM"
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const time = `${String(displayHours).padStart(2, '0')}.${String(minutes).padStart(2, '0')} ${ampm}`;
    
    // Format date as "24/5/2025"
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    return { 
      time: time, 
      date: formattedDate 
    };
  };

  // Helper function to generate share URL
  const generateShareUrl = (meetingId) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${meetingId}`;
  };

  // Helper function to copy share URL
  const copyShareUrl = (meetingId) => {
    const shareUrl = generateShareUrl(meetingId);
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Share link copied to clipboard!");
    }).catch(err => {
      toast.error("Failed to copy link");
    });
  };

  // Helper function to open share URL in new tab
  const openShareUrl = (meetingId) => {
    const shareUrl = generateShareUrl(meetingId);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMeetings = meetings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(meetings.length / itemsPerPage);

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Reset to first page when meetings change
  useEffect(() => {
    setCurrentPage(1);
  }, [meetings]);

  return (
    <>
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between p-4 relative min-h-[140px]">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setLandlordDialogOpen(true)}
              style={{ minWidth: '120px' }}
            >
              {getLandlordLogo() ? (
                <img 
                  src={getLandlordLogo()} 
                  alt="Landlord Logo" 
                  className="max-h-10 max-w-[120px] object-contain" 
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <span className="text-gray-600">Your logo here</span>
                </div>
              )}
            </div>
            
            {/* Center positioned dashboard and image - fixed position */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center flex-col z-10">
              <h1 className="text-4xl font-bold">Dashboard</h1>
              <img src="/devices.svg" alt="Videodesk" className="mt-2 w-60" />
            </div>
            
            <div className="flex items-center gap-4">
              {/* Archive Icon Button */}
              <Button 
                className={`${viewMode === 'archived' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-full p-3`}
                onClick={() => {
                  console.log('🔄 Current viewMode:', viewMode);
                  if (viewMode === 'archived') {
                    console.log('🔄 Switching to active meetings');
                    setViewMode('active'); // Switch back to active meetings
                  } else {
                    console.log('🔄 Switching to archived meetings');
                    setViewMode('archived'); // Show archived meetings
                  }
                }}
                title={viewMode === 'archived' ? 'View Active Meetings' : 'View Archived Meetings'}
              >
                <Archive className="w-5 h-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className={"bg-amber-500 text-white rounded-3xl flex items-center gap-2 text-xl"}>Actions <img src="/icons/arrow-down.svg"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={'bg-white border-none shadow-sm'}>
                  <DropdownMenuItem>
                    <button className='bg-none border-none cursor-pointer' onClick={handleLogout}>Logout</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Dashboard</DropdownMenuItem>
                  <DropdownMenuItem>
                    <button className='bg-none border-none cursor-pointer' onClick={() => setTickerOpen(true)}>Raise Support Ticket</button>
                  </DropdownMenuItem>
                  <DropdownMenuItem><button className='bg-none border-none cursor-pointer' onClick={() => setResetOpen(true)}>Reset Password</button></DropdownMenuItem>
                  <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setInviteOpen(true)}>Invite Coworkers</button></DropdownMenuItem>
                  <DropdownMenuItem><button className='bg-none border-none cursor-pointer' onClick={() => setMessageOpen(true)}>Amend Message</button></DropdownMenuItem>
                  <DropdownMenuItem> <button className='bg-none border-none cursor-pointer text-left' onClick={() => setLandlordDialogOpen(true)}>Add Landlord Name/Logo/ <br />Profile Image </button></DropdownMenuItem>
                  <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setFaqOpen(true)}>FAQs</button></DropdownMenuItem>
                  <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setFeedbackOpen(true)}>Give Feedback</button></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* User Profile and Launch Button */}
          <div className="flex items-center">
            <div className="flex items-start gap-2 bg-white p-4 flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className={`w-12 h-12 overflow-hidden cursor-pointer ${getProfileShapeClass()} flex items-center justify-center border border-gray-300`}
                  onClick={() => setLandlordDialogOpen(true)}
                  title="Click to update profile image"
                >
                  {getProfileImage() ? (
                    <img
                      src={getProfileImage()}
                      alt="Profile Image"
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide the image if it fails to load
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-lg">
                      {getInitials(getDisplayName())}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hello,</p>
                  <p className="font-semibold">{getDisplayName()}</p>
                </div>
              </div>

              <div className="space-y-0 w-full">
                <div className="flex items-center gap-2">
                  <p className="text-left whitespace-nowrap w-20">Logged in</p>
                  <span>:</span>
                  <p className="text-left whitespace-nowrap">{formatLoginTime(user?.currentLoginTime)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-left whitespace-nowrap w-20">Last Log in</p>
                  <span>:</span>
                  <p className="text-left whitespace-nowrap">{getLastLoginTime()}</p>
                </div>
              </div>

              <Button className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-lg font-medium cursor-pointer mt-4 text-lg" onClick={() => {
                setShowForm(true);
                setIsManualSelection(false);
              }}>
                Launch new video link
              </Button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-md overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="px-4 py-2 font-semibold text-black text-left w-2/5">Resident name and address</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/4">Video Link</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/6">Time and Date</th>
                  <th className="px-4 py-2 font-semibold text-black text-left w-1/6">
                    <div>
                      <span className="block">{viewMode === 'archived' ? 'Discard/Unarchive/' : 'Discard/Archive/'}</span>
                      <span className="block">Export/History</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading meetings...
                      </div>
                    </td>
                  </tr>
                ) : meetings.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">
                      {viewMode === 'archived' ? 'No archived meetings found.' : 'No meetings found. Create your first video link to get started!'}
                    </td>
                  </tr>
                ) : (
                  currentMeetings.map((meeting, index) => {
                    const { time, date } = formatMeetingDate(meeting.createdAt);
                    const shareUrl = generateShareUrl(meeting.meeting_id);
                    const actualIndex = indexOfFirstItem + index;
                    const isArchived = meeting.archived || false; // Check archived status from database
                    
                    return (
                      <tr key={meeting._id} className="hover:bg-gray-50 border-b">
                        <td className="px-4 py-3 w-2/5">
                          <div className="flex items-center gap-2">
                            <span>{actualIndex + 1}. {meeting.name || 'Unknown Resident'}, {meeting.address || 'No address provided'}</span>
                            {/* Show archived badge if meeting is archived */}
                            {isArchived && viewMode !== 'archived' && (
                              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                                Archived
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 w-1/4">
                          <button
                            onClick={() => openShareUrl(meeting.meeting_id)}
                            className="text-blue-600 underline hover:text-blue-800 cursor-pointer text-left"
                            title="Click to open share link in new tab"
                          >
                            www.Videodesk.co.uk/share/{meeting.meeting_id.substring(0, 8)}...
                          </button>
                        </td>
                        <td className="px-4 py-3 w-1/6">{time} {date}</td>
                        <td className="px-4 py-3 w-1/6">
                          <div className="flex justify-start gap-3">
                            <button 
                              title="Discard"
                              onClick={() => handleDeleteMeeting(meeting._id, meeting.name)}
                              className="hover:bg-red-50 p-1 rounded"
                            >
                              <img src="/icons/trash-red.svg" className="w-4 h-4" />
                            </button>
                            
                            {/* Show appropriate archive/unarchive button based on meeting status */}
                            {isArchived ? (
                              <button 
                                title="Unarchive"
                                onClick={() => handleUnarchiveMeeting(meeting._id, meeting.name)}
                                className="hover:bg-green-50 p-1 rounded"
                              >
                                <ArchiveRestore className="w-4 h-4 text-green-600" />
                              </button>
                            ) : (
                              <button 
                                title="Archive"
                                onClick={() => handleArchiveMeeting(meeting._id, meeting.name)}
                                className="hover:bg-gray-50 p-1 rounded"
                              >
                                <img src="/icons/download.svg" className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button 
                              title="Export" 
                              onClick={() => setExportOpen(true, meeting)}
                              className="hover:bg-gray-50 p-1 rounded"
                            >
                              <img src="/icons/icon-park_share.svg" className="w-5 h-5" />
                            </button>
                            <button 
                              title="History"
                              className="hover:bg-gray-50 p-1 rounded"
                            >
                              <img src="/icons/icon-park-outline_history-query.svg" className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {meetings.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6 px-4">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, meetings.length)} of {meetings.length} results
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageClick(pageNumber)}
                        className={`px-3 py-1 text-sm border border-gray-300 rounded-md ${
                          currentPage === pageNumber
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {
        showForm &&
        <div className="h-screen w-screen bg-black/10 absolute top-0 left-0 right-0 bottom-0 px-16 flex items-center justify-center">
          <div className="mx-auto  bg-white rounded-xl shadow-md p-8 relative overflow-hidden relative">
            <h3 className="text-xl font-semibold mb-6 text-center">Enter your customer's mobile number or email address below to send an instant video link</h3>


            <button
              onClick={() => {
                setShowForm(false);
                setIsManualSelection(false); // Reset manual selection when closing form
              }}
              aria-label="Close"
              className="text-gray-500 hover:text-gray-800 absolute top-3 right-3 cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <input
                  ref={phoneInputRef}
                  type="text"
                  placeholder="Enter customer mobile number"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${contactMethod === 'phone' ? 'bg-white' : 'bg-gray-100'}`}
                  value={phone}
                  onChange={(e) => handleInputChange(e.target.value, 'phone')}
                  onClick={() => {
                    setContactMethod('phone');
                    setIsManualSelection(true);
                  }}
                />
              </div>

              <div className="self-center">
                <span className="text-gray-500">or</span>
              </div>

              <div className="flex-1 w-full">
                <input
                  ref={emailInputRef}
                  type="email"
                  placeholder="Enter customer email address"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${contactMethod === 'email' ? 'bg-white' : 'bg-gray-100'}`}
                  value={email}
                  onChange={(e) => handleInputChange(e.target.value, 'email')}
                  onClick={() => {
                    setContactMethod('email');
                    setIsManualSelection(true);
                  }}
                />
              </div>

              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <>Send<br />video link</>}

              </button>
            </form>
          </div>
        </div>
      }

      <CustomDialog open={open} setOpen={() => {}} heading={"Link sent successfully"}>
        <div className="h-[33rem] p-16 flex flex-col items-center justify-center">
          <Image src="/paper-plane.png" alt="video-link-dialog-bg" className='object-contain' width={200} height={200} />
          <div className='mt-5'>
            <div className='flex items-start gap-2'>
              <img className='w-8 h-8' src='/icons/single-check.svg' />
              <div className='flex flex-col gap-0 mb-1'>
                <h2 className="text-2xl font-bold text-left">
                  Link sent successfully
                </h2>
                <p>Please wait a second for the user to accept...</p>
              </div>
            </div>
            
            {/* Show double check only when link is accepted */}
            <div className={`flex items-start gap-2 mt-5 transition-opacity duration-500 ${linkAccepted ? 'opacity-100' : 'opacity-30'}`}>
              <img 
                className={`w-8 h-8 transition-all duration-500 ${linkAccepted ? 'filter-none' : 'grayscale'}`} 
                src='/icons/double-check.svg' 
              />
              <div className='flex flex-col gap-0 mb-1'>
                <h2 className={`text-2xl font-bold text-left transition-colors duration-500 ${linkAccepted ? 'text-green-600' : 'text-gray-400'}`}>
                  {linkAccepted ? 'Link accepted by user' : 'Waiting for user to open link...'}
                </h2>
              </div>
            </div>

            <Link 
              href={`/room/admin/${token}`} 
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 cursor-pointer h-12 rounded-3xl mt-10 text-2xl block w-full text-center transition-all duration-300"
            >
              Join video session
            </Link>

            <div className='flex items-start mt-4 justify-center'>
              <p className='text-center'>
                <strong className='text-red-400 whitespace-pre'>TIP - </strong> 
                Ask the user to check their spam folder for the email link, if they can't see it!
              </p>
            </div>
          </div>
        </div>
      </CustomDialog>
    </>
  )
}
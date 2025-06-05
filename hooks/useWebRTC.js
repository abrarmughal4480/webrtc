import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../http';
import useAuth from './useAuth';

const useWebRTC = (isAdmin, roomId, videoRef) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [peers, setPeers] = useState([]);
    const [screenshots, setScreenshots] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [meetingInfo, setMeetingInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const videoElementsRef = useRef({});

    useEffect(() => {
        const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
            transports: ['websocket'],
            query: { roomId, userId: user._id }
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to WebRTC signaling server');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebRTC signaling server');
        });

        newSocket.on('all-users', (users) => {
            const peers = [];
            users.forEach(({ userId, socketId }) => {
                if (userId !== user._id) {
                    peers.push({ userId, socketId });
                }
            });
            setPeers(peers);
        });

        newSocket.on('user-joined', ({ userId, socketId }) => {
            setPeers((prev) => [...prev, { userId, socketId }]);
        });

        newSocket.on('user-left', ({ userId }) => {
            setPeers((prev) => prev.filter((peer) => peer.userId !== userId));
        });

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, user]);

    const startRecording = async () => {
        try {
            const response = await api.post('/meetings/start-recording', { roomId });
            setRecordings((prev) => [...prev, response.data]);
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    };

    const stopRecording = async (recordingId) => {
        try {
            const response = await api.post('/meetings/stop-recording', { recordingId });
            setRecordings((prev) => prev.map((rec) => (rec._id === recordingId ? response.data : rec)));
        } catch (error) {
            console.error('Error stopping recording:', error);
        }
    };

    const takeScreenshot = async () => {
        try {
            const response = await api.post('/meetings/take-screenshot', { roomId });
            setScreenshots((prev) => [...prev, response.data]);
        } catch (error) {
            console.error('Error taking screenshot:', error);
        }
    };

    // Add function to remove screenshot after saving
    const removeScreenshot = (index) => {
        setScreenshots(prev => prev.filter((_, i) => i !== index));
    };

    const fetchMeetingInfo = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/meetings/by-meeting-id/${roomId}`);
            setMeetingInfo(response.data);
        } catch (error) {
            console.error('Error fetching meeting info:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roomId) {
            fetchMeetingInfo();
        }
    }, [roomId]);

    return {
        socket,
        peers,
        screenshots,
        recordings,
        meetingInfo,
        loading,
        startRecording,
        stopRecording,
        takeScreenshot,
        removeScreenshot // Return the new function
    };
};

export default useWebRTC;
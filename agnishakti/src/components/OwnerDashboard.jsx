import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Eye, 
  Zap, 
  Bell, 
  Camera, 
  Users, 
  X, 
  MapPin, 
  Phone, 
  Building,
  Lock,
  Mail,
  User,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Plus,
  Settings,
  Home,
  AlertTriangle,
  Power,
  PowerOff,
  Upload,
  Video,
  Clock,
  Trash2,
  Edit,
  Save,
  LogOut
} from 'lucide-react';

// Video playlist for background
const VIDEO_PLAYLIST = [
  "https://sample-videos.com/zip/10/mp4/480/SampleVideo_1280x720_1mb.mp4",
];

const OwnerDashboard = ({ email }) => {
  // User and profile state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [modalState, setModalState] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // Data state
  const [houses, setHouses] = useState([]);
  const [cameras, setCameras] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activeStreams, setActiveStreams] = useState({});

  // Form states
  const [houseForm, setHouseForm] = useState({
    address: '',
    latitude: '',
    longitude: '',
    monitorPassword: ''
  });
  const [cameraForm, setCameraForm] = useState({
    cameraName: '',
    streamUrl: ''
  });

  // Alert system
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertCountdown, setAlertCountdown] = useState(0);
  const alertInterval = useRef(null);

  // Demo states
  const [selectedFile, setSelectedFile] = useState(null);
  const [demoStream, setDemoStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // WebSocket for real-time alerts
  const ws = useRef(null);
useEffect(() => {
    // Flag to prevent state updates on unmounted component
    let isMounted = true;
    let pollingInterval = null;

    // A single, comprehensive function to fetch all initial data
    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError('');

            // 1. Fetch User Data
            const userResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!userResponse.ok) throw new Error('Failed to fetch user data');
            const userData = await userResponse.json();
            if (isMounted) setUser(userData.user);

            // 2. Fetch ALL Houses for the owner
            const housesResponse = await fetch(`/api/houses?ownerEmail=${email}`);
            if (!housesResponse.ok) throw new Error('Failed to fetch houses');
            const housesData = await housesResponse.json();
            const housesArray = housesData.houses || [];
            if (isMounted) setHouses(housesArray);

            // 3. Fetch ALL Cameras for the owner
            const camerasResponse = await fetch(`/api/cameras?ownerEmail=${email}`);
            if (!camerasResponse.ok) throw new Error('Failed to fetch cameras');
            const camerasData = await camerasResponse.json();
            const camerasArray = camerasData.cameras || [];
            
            // Group cameras by houseId for easier lookup
            const camerasByHouse = camerasArray.reduce((acc, camera) => {
                const { houseId } = camera;
                if (!acc[houseId]) {
                    acc[houseId] = [];
                }
                acc[houseId].push(camera);
                return acc;
            }, {});
            if (isMounted) setCameras(camerasByHouse);

            // Check if user needs to complete profile
            if (housesArray.length === 0 && isMounted) {
                setModalState('add-house-prompt');
            }
        } catch (err) {
            if (isMounted) {
                console.error("Dashboard initialization failed:", err);
                setError("Failed to load dashboard data. Please try again.");
            }
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    // Function to poll for alerts
    const pollAlerts = async () => {
        try {
            const response = await fetch(`/api/alerts?ownerEmail=${email}`);
            if (response.ok) {
                const responseData = await response.json();
                const currentAlerts = responseData.alerts || [];

                // Check for a new pending/confirmed alert to trigger the modal
                const latestAlert = currentAlerts.find(alert => alert.status === 'PENDING' || alert.status === 'CONFIRMED');
                if (latestAlert && !activeAlert) {
                    startAlertCountdown(latestAlert);
                }
                
                // Update the main alerts state regardless
                if (isMounted) {
                    setAlerts(currentAlerts);
                }
            }
        } catch (err) {
            console.error('Error polling alerts:', err);
        }
    };
    
    // Initial data fetch and start polling
    fetchAllData();
    pollingInterval = setInterval(pollAlerts, 5000);

    // Cleanup function
    return () => {
        isMounted = false;
        clearInterval(pollingInterval);
        if (alertInterval.current) {
            clearInterval(alertInterval.current);
        }
    };
}, [email, activeAlert]); // **Important**: Add activeAlert to dependencies

const startAlertCountdown = (alertData) => {
    if (activeAlert) return; // Prevents multiple alerts from being active at once
    
    setActiveAlert(alertData);
    setAlertCountdown(30);

    if (alertInterval.current) clearInterval(alertInterval.current);
    
    alertInterval.current = setInterval(() => {
        setAlertCountdown(prev => {
            if (prev <= 1) {
                // The timer expired, the alert is considered confirmed.
                // The backend already handled the notification, so the frontend's job is done.
                clearInterval(alertInterval.current);
                setActiveAlert(null);
                showToast('Emergency services have been notified!');
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
};
  // Cancel active alert
  const cancelAlert = () => {
    if (alertInterval.current) {
      clearInterval(alertInterval.current);
    }
    setActiveAlert(null);
    setAlertCountdown(0);
  };

  // Add new house
  const handleAddHouse = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerEmail: email,
          address: houseForm.address,
          coords: { 
            lat: parseFloat(houseForm.latitude), 
            lng: parseFloat(houseForm.longitude) 
          },
          monitorPassword: houseForm.monitorPassword
        })
      });

      if (response.ok) {
    const newHouseData = await response.json();
    setHouses(prev => [...prev, newHouseData.house]); // Assuming response returns the new house object
    setModalState(null);
    setHouseForm({ address: '', latitude: '', longitude: '', monitorPassword: '' });
    showToast('House added successfully!');
}else {
        throw new Error('Failed to add house');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Add new camera
const handleAddCamera = async (e) => {
  e.preventDefault();
  if (!selectedHouse) return;

  try {
    const response = await fetch('/api/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerEmail: email,
        houseId: selectedHouse.houseId,
        cameraName: cameraForm.cameraName,
        streamUrl: cameraForm.streamUrl
      })
    });

    if (response.ok) {
    const newCameraData = await response.json();
    showToast('Camera added successfully!');
    setModalState(null);
    setCameraForm({ cameraName: '', streamUrl: '' });
    // Update the local state by adding the new camera
    setCameras(prev => {
        const newCameras = { ...prev };
        const houseId = selectedHouse.houseId; // Correct casing
        if (!newCameras[houseId]) {
            newCameras[houseId] = [];
        }
        newCameras[houseId].push(newCameraData.camera); // Assuming the response returns the new camera object
        return newCameras;
    });
}else {
      throw new Error('Failed to add camera');
    }
  } catch (err) {
    setError(err.message);
  }
};

  // Delete camera
  const handleDeleteCamera = async (cameraId) => {
  try {
    const response = await fetch('/api/cameras', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cameraId })
    });

    if (response.ok) {
      showToast('Camera deleted successfully!');
      // Update the local state to remove the deleted camera
      setCameras(prev => {
        const newCameras = { ...prev };
        // Filter out the deleted camera from the appropriate house's camera list
        if (newCameras[selectedHouse.houseId]) {
          newCameras[selectedHouse.houseId] = newCameras[selectedHouse.houseId].filter(
            (camera) => camera.cameraId !== cameraId
          );
        }
        return newCameras;
      });
    } else {
      throw new Error('Failed to delete camera');
    }
  } catch (err) {
    setError(err.message);
  }
};
const toggleCameraMonitoring = async (cameraId, currentStatus) => {
  try {
    const endpoint = currentStatus ? '/api/monitoring/stop' : '/api/monitoring/start';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cameraId })
    });

    if (response.ok) {
      showToast(`Monitoring ${currentStatus ? 'stopped' : 'started'} successfully!`);
      // Update the local state to reflect the change
      setCameras(prev => {
        const newCameras = { ...prev };
        if (newCameras[selectedHouse.houseId]) {
          newCameras[selectedHouse.houseId] = newCameras[selectedHouse.houseId].map(
            (camera) => 
              camera.cameraId === cameraId 
                ? { ...camera, isMonitoring: !currentStatus } 
                : camera
          );
        }
        return newCameras;
      });
    } else {
      throw new Error('Failed to toggle monitoring');
    }
  } catch (err) {
    setError(err.message);
  }
};
  // Demo: Use webcam
  const startWebcamDemo = () => {
    setDemoStream('http://localhost:8000/webcam_feed');
    showToast('Webcam demo started!');
  };

  // Demo: Upload video
  const handleVideoUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file first!');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const response = await fetch('http://localhost:8000/upload_video', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setDemoStream(`http://localhost:8000/video_feed/${data.filename}`);
        showToast('Video processing started!');
      } else {
        throw new Error('Failed to upload video');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Utility functions
  const showToast = (message) => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 opacity-0 transition-opacity duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.opacity = '1', 100);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const togglePlayPause = () => {
    const video = document.getElementById('background-video');
    if (video) {
      if (isVideoPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <div className="fixed inset-0 z-0">
        <video
          id="background-video"
          key={currentVideoIndex}
          autoPlay
          loop
          muted={isVideoMuted}
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={VIDEO_PLAYLIST[currentVideoIndex]} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-[1px]" />
      </div>

      {/* Alert Overlay */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 bg-red-900/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-white/10 backdrop-blur-xl border border-red-500/50 rounded-3xl p-8 max-w-md w-full text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <AlertTriangle className="w-12 h-12 text-white" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-4">FIRE DETECTED!</h2>
              <p className="text-red-200 mb-6">
                Fire detected at {activeAlert.location || 'your property'}
              </p>
              
              <div className="text-6xl font-bold text-red-300 mb-6">
                {alertCountdown}
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={cancelAlert}
                  className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Turn Off Alert
                </button>
                <p className="text-red-200 text-sm">
                  Emergency services will be notified automatically if not cancelled
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="p-6 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center"
              >
                <Shield className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white">AgniShakti Dashboard</h1>
                <p className="text-gray-400">Welcome back, {user?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Alerts indicator */}
              {alerts.length > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  <Bell className="w-6 h-6 text-orange-400" />
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                    {alerts.length}
                  </div>
                </motion.div>
              )}

              {/* Profile menu */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setModalState('profile')}
                className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
              >
                <User className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Dashboard */}
        <div className="p-6 max-w-7xl mx-auto">
          {!selectedHouse ? (
            // Houses Overview
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-4xl font-bold text-white mb-2">My Properties</h2>
                  <p className="text-gray-400">Manage your protected properties</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setModalState('add-house')}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Property
                </motion.button>
              </div>

              {houses.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Home className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">No Properties Added</h3>
                  <p className="text-gray-400 mb-8">Add your first property to start monitoring</p>
                  <button
                    onClick={() => setModalState('add-house')}
                    className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300"
                  >
                    Add Your First Property
                  </button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {houses.map((house, index) => (
                    <motion.div
                      key={house.houseId || house.houseId}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      onClick={() => setSelectedHouse(house)}
                      className="cursor-pointer p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-2xl"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
                          <Home className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Camera className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">
                              {cameras[house.houseId]?.length || 0} cameras
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2">Property</h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{house.address}</p>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-gray-300">
                          {house.coords?.lat?.toFixed(4)}, {house.coords?.lng?.toFixed(4)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Demo Section */}
              <div className="mt-16">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Live AI Demo</h2>
                  <p className="text-gray-400">Test the fire detection system in real-time</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Demo Controls */}
                  <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
                    <h3 className="text-xl font-bold text-white mb-6">Demo Controls</h3>
                    
                    <div className="space-y-4 mb-6">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={startWebcamDemo}
                        className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3"
                      >
                        <Video className="w-5 h-5" />
                        Use Laptop Webcam
                      </motion.button>

                      <div className="space-y-3">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500 file:text-white file:cursor-pointer"
                        />
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          onClick={handleVideoUpload}
                          disabled={!selectedFile || isProcessing}
                          className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          <Upload className="w-5 h-5" />
                          {isProcessing ? 'Processing...' : 'Upload Demo Video'}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Demo Stream */}
                  <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
                    <h3 className="text-xl font-bold text-white mb-6">Live AI Detection</h3>
                    
                    <div className="aspect-video bg-black/50 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                      {demoStream ? (
                        <img 
                          src={demoStream} 
                          alt="Live AI Detection" 
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="text-center">
                          <Eye className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-400">Select a demo option to start AI detection</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Camera Management View
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedHouse(null)}
                    className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                  <div>
                    <h2 className="text-4xl font-bold text-white mb-2">Camera Management</h2>
                    <p className="text-gray-400">{selectedHouse.address}</p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setModalState('add-camera')}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Camera
                </motion.button>
              </div>

              {cameras[selectedHouse.houseId]?.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">No Cameras Added</h3>
                  <p className="text-gray-400 mb-8">Add your first camera to start monitoring this property</p>
                  <button
                    onClick={() => setModalState('add-camera')}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300"
                  >
                    Add Your First Camera
                  </button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cameras[selectedHouse.houseId]?.map((camera, index) => (
                    <motion.div
                      key={camera.cameraId || camera.cameraId}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-2xl"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center">
                          <Camera className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => toggleCameraMonitoring(camera.cameraId, camera.isMonitoring)}
                            className={`p-2 rounded-lg transition-colors ${
                              camera.isMonitoring 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {camera.isMonitoring ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => handleDeleteCamera(camera.cameraId)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2">{camera.cameraName}</h3>
                      <p className="text-gray-400 text-sm mb-4">{camera.streamUrl}</p>
                      
                      <div className="aspect-video bg-black/50 rounded-xl flex items-center justify-center border border-white/10 mb-4 overflow-hidden">
                        {activeStreams[camera.cameraId] ? (
                          <img 
                            src={camera.streamUrl} 
                            alt={camera.cameraName}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <div className="text-center">
                            <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">Camera feed</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${camera.isMonitoring ? 'bg-green-400' : 'bg-gray-500'}`} />
                          <span className="text-sm text-gray-400">
                            {camera.isMonitoring ? 'Monitoring' : 'Offline'}
                          </span>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={() => toggleCameraMonitoring(camera.cameraId, camera.isMonitoring)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                            camera.isMonitoring 
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                        >
                          {camera.isMonitoring ? 'Stop' : 'Start'}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setModalState(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">
                  {modalState === 'add-house' && 'Add New Property'}
                  {modalState === 'add-house-prompt' && 'Complete Your Profile'}
                  {modalState === 'add-camera' && 'Add New Camera'}
                  {modalState === 'profile' && 'Your Profile'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setModalState(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {(modalState === 'add-house' || modalState === 'add-house-prompt') && (
                  <form onSubmit={handleAddHouse} className="space-y-4">
                    {modalState === 'add-house-prompt' && (
                      <div className="text-center mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                        <p className="text-orange-300 text-sm">
                          Please add your property details to start monitoring your home for fire safety.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Property Address
                      </label>
                      <input
                        type="text"
                        value={houseForm.address}
                        onChange={(e) => setHouseForm({ ...houseForm, address: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
                        placeholder="123 Main Street, City, State"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={houseForm.latitude}
                          onChange={(e) => setHouseForm({ ...houseForm, latitude: e.target.value })}
                          required
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
                          placeholder="40.7128"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={houseForm.longitude}
                          onChange={(e) => setHouseForm({ ...houseForm, longitude: e.target.value })}
                          required
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
                          placeholder="-74.0060"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Monitor Password
                      </label>
                      <input
                        type="password"
                        value={houseForm.monitorPassword}
                        onChange={(e) => setHouseForm({ ...houseForm, monitorPassword: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
                        placeholder="Secure password for monitoring"
                      />
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <p className="text-blue-300 text-sm">
                        ℹ️ The nearest fire station will be automatically assigned based on your property's GPS coordinates.
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg"
                    >
                      Add Property
                    </motion.button>
                  </form>
                )}

                {modalState === 'add-camera' && (
                  <form onSubmit={handleAddCamera} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Camera Name
                      </label>
                      <input
                        type="text"
                        value={cameraForm.cameraName}
                        onChange={(e) => setCameraForm({ ...cameraForm, cameraName: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                        placeholder="Front Door Camera"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Stream URL
                      </label>
                      <input
                        type="url"
                        value={cameraForm.streamUrl}
                        onChange={(e) => setCameraForm({ ...cameraForm, streamUrl: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                        placeholder="rtsp://camera-ip:554/stream"
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg"
                    >
                      Add Camera
                    </motion.button>
                  </form>
                )}

                {modalState === 'profile' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{user?.name}</h3>
                      <p className="text-gray-400 mb-4">{user?.email}</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-300 text-sm">
                        <Shield className="w-4 h-4" />
                        Property Owner
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-semibold">Properties</h4>
                            <p className="text-gray-400 text-sm">{houses.length} properties monitored</p>
                          </div>
                          <Home className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-semibold">Cameras</h4>
                            <p className="text-gray-400 text-sm">
                              {Object.values(cameras).flat().length} cameras installed
                            </p>
                          </div>
                          <Camera className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-semibold">Alerts</h4>
                            <p className="text-gray-400 text-sm">{alerts.length} total alerts</p>
                          </div>
                          <Bell className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        // Sign out logic would go here
                        window.location.href = '/';
                      }}
                      className="w-full px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Particles Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-5">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-400/20 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: (typeof window !== 'undefined' ? window.innerHeight : 1080) + 10,
            }}
            animate={{
              y: -10,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      {/* Floating Action Button for Video Controls (Mobile) */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-30 md:hidden"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={togglePlayPause}
          className="p-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-full text-white shadow-2xl hover:shadow-orange-500/25 transition-all duration-300"
        >
          {isVideoPlaying ? <Pause size={24} /> : <Play size={24} />}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default OwnerDashboard;
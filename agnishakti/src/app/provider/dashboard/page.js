'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, Users, AlertTriangle, MapPin, Phone, Building } from 'lucide-react';

export default function ProviderDashboardPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (currentUser) {
      fetchUserAndDashboardData();
    }
  }, [currentUser]);

  const fetchUserAndDashboardData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch user details
      const userResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email })
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
        
        // Fetch provider dashboard data
        const dashboardResponse = await fetch(`/api/provider/dashboard?providerEmail=${currentUser.email}`);
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          setDashboardData(dashboardData.dashboard || []);
        }
      }
    } catch (err) {
      console.error('Error fetching provider data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="p-6 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Emergency Services Dashboard</h1>
              <p className="text-gray-400">Welcome, {user?.name || 'Provider'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Fire Station Dashboard</h2>
          <p className="text-gray-400">Monitor properties in your coverage area</p>
        </div>

        {dashboardData.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No Properties Assigned</h3>
            <p className="text-gray-400 mb-8">You haven't been assigned to any fire stations yet.</p>
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md mx-auto">
              <h4 className="text-lg font-semibold text-white mb-4">Provider Information</h4>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-orange-400" />
                  <span className="text-gray-300">Name: {user?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-orange-400" />
                  <span className="text-gray-300">Role: {user?.role || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <span className="text-gray-300">Assigned Stations: {user?.assignedStations?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.map((house, index) => (
              <div
                key={house.houseId}
                className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-2xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
                    <Building className="w-7 h-7 text-white" />
                  </div>
                  {house.activeAlerts?.length > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">{house.activeAlerts.length} alerts</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Property</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{house.address}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-gray-300">
                      {house.coords?.lat?.toFixed(4)}, {house.coords?.lng?.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-gray-300">Owner: {house.ownerEmail}</span>
                  </div>
                </div>

                {house.activeAlerts?.length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <h4 className="text-sm font-semibold text-red-400 mb-2">Active Alerts</h4>
                    {house.activeAlerts.map((alert, alertIndex) => (
                      <div key={alertIndex} className="text-xs text-red-300">
                        Status: {alert.status} - {new Date(alert.timestamp?.toDate?.() || alert.timestamp).toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

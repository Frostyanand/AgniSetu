'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import SignIn from '@/components/SignIn'; // <-- ADD THIS LINE

// A simple loading spinner
function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin"></div>
    </div>
  )
}

export default function Page() {
  const { currentUser, loading } = useAuth();

  // Show a loader while Firebase is checking the auth state
  if (loading) {
    return <FullScreenLoader />;
  }

  // If loading is finished and there's no user, show the sign-in page
  if (!currentUser) {
    return <SignIn />;
  }

  // If the user is signed in, show the main app content
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1>Welcome, {currentUser.displayName || currentUser.email}!</h1>
        {/* You can add back your main application components here later */}
    </div>
  );
}

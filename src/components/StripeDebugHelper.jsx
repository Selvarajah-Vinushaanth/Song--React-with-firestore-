import React, { useEffect, useState } from 'react';

export default function StripeDebugHelper() {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const planId = urlParams.get('plan');

    // Get localStorage info
    const pendingUpgrade = localStorage.getItem('pendingUpgrade');
    let parsedPending = null;
    try {
      if (pendingUpgrade) {
        parsedPending = JSON.parse(pendingUpgrade);
      }
    } catch (e) {
      console.error('Failed to parse pending upgrade:', e);
    }

    const info = {
      urlParams: {
        session_id: sessionId,
        success: success,
        canceled: canceled,
        plan: planId,
      },
      localStorage: {
        pendingUpgrade: parsedPending,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        REACT_APP_STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not Set',
        REACT_APP_DOMAIN: process.env.REACT_APP_DOMAIN,
      },
      currentUrl: window.location.href,
      timestamp: new Date().toISOString(),
    };

    setDebugInfo(info);
    console.log('🔍 Stripe Debug Info:', info);
  }, []);

  // Only show in development and when there are URL params or localStorage data
  if (process.env.NODE_ENV !== 'development') return null;
  
  const hasRelevantData = 
    debugInfo.urlParams?.success || 
    debugInfo.urlParams?.canceled || 
    debugInfo.localStorage?.pendingUpgrade;

  if (!hasRelevantData) return null;

  return (
    <div className="fixed top-20 right-4 z-50 bg-black/90 text-white p-4 rounded-lg border border-yellow-400 max-w-md text-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <span className="font-semibold text-yellow-400">Stripe Debug</span>
      </div>
      
      <div className="space-y-2">
        <div>
          <div className="text-blue-300 font-semibold">URL Parameters:</div>
          <div className="ml-2">
            {Object.entries(debugInfo.urlParams || {}).map(([key, value]) => (
              <div key={key} className={value ? 'text-green-300' : 'text-gray-400'}>
                {key}: {value || 'null'}
              </div>
            ))}
          </div>
        </div>

        {debugInfo.localStorage?.pendingUpgrade && (
          <div>
            <div className="text-purple-300 font-semibold">Pending Upgrade:</div>
            <div className="ml-2 text-green-300">
              Plan: {debugInfo.localStorage.pendingUpgrade.planId}
            </div>
          </div>
        )}

        <div>
          <div className="text-orange-300 font-semibold">Environment:</div>
          <div className="ml-2">
            <div className="text-gray-300">Domain: {debugInfo.environment?.REACT_APP_DOMAIN}</div>
            <div className="text-gray-300">Stripe Key: {debugInfo.environment?.REACT_APP_STRIPE_PUBLISHABLE_KEY}</div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => setDebugInfo({})}
        className="mt-2 text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
      >
        Close
      </button>
    </div>
  );
}
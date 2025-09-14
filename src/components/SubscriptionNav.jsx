import React from 'react';
import { Link } from 'react-router-dom';
import { usePayment } from '../context/PaymentContext';

export default function SubscriptionNav({ className = '', variant = 'default' }) {
  const { remainingTokens: tokens, userSubscription: subscription } = usePayment();

  // Helper function to get plan display name
  const getPlanDisplayName = (subscription) => {
    if (!subscription || !subscription.planId) return 'Free';
    
    const planMap = {
      'free': 'Free',
      'basic': 'Basic', 
      'pro': 'Pro',
      'enterprise': 'Enterprise'
    };
    
    return planMap[subscription.planId] || 'Free';
  };

  const currentPlan = getPlanDisplayName(subscription);

  if (variant === 'compact') {
    return (
      <Link
        to="/subscription"
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            tokens <= 10 ? 'bg-red-400' : tokens <= 50 ? 'bg-yellow-400' : 'bg-emerald-400'
          }`}></div>
          <span className="text-gray-300">{tokens} tokens</span>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            currentPlan === 'Enterprise' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' :
            currentPlan === 'Pro' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' :
            currentPlan === 'Basic' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
            'bg-gray-600 text-gray-200'
          }`}>
            {currentPlan}
          </span>
        </div>
      </Link>
    );
  }

  if (variant === 'card') {
    return (
      <Link
        to="/subscription"
        className={`block p-4 rounded-xl bg-gradient-to-r from-gray-800/80 to-gray-700/80 border border-gray-600/30 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 ${className}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            Subscription
          </h3>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Current Plan</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              currentPlan === 'Enterprise' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' :
              currentPlan === 'Pro' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' :
              currentPlan === 'Basic' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
              'bg-gray-600 text-gray-200'
            }`}>
              {currentPlan}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Tokens Remaining</span>
            <span className={`font-medium ${
              tokens <= 10 ? 'text-red-400' : tokens <= 50 ? 'text-yellow-400' : 'text-emerald-400'
            }`}>
              {tokens}
            </span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                tokens <= 10 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                tokens <= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-emerald-500 to-teal-500'
              }`}
              style={{ width: `${Math.min((tokens / 1000) * 100, 100)}%` }}
            ></div>
          </div>
          
          {tokens <= 50 && (
            <div className="mt-3 p-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-orange-300">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>Low token balance - Consider upgrading!</span>
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <div className={`bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg p-4 border border-gray-600/30 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-100">Subscription Status</h3>
        <Link
          to="/subscription"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium hover:underline"
        >
          Manage →
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-gray-400 block">Current Plan</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold inline-block mt-1 ${
            currentPlan === 'Enterprise' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' :
            currentPlan === 'Pro' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' :
            currentPlan === 'Basic' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
            'bg-gray-600 text-gray-200'
          }`}>
            {currentPlan}
          </span>
        </div>
        
        <div>
          <span className="text-sm text-gray-400 block">Tokens Remaining</span>
          <span className={`text-xl font-bold mt-1 block ${
            tokens <= 10 ? 'text-red-400' : tokens <= 50 ? 'text-yellow-400' : 'text-emerald-400'
          }`}>
            {tokens}
          </span>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Token Usage</span>
          <span>{tokens}/1000</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              tokens <= 10 ? 'bg-gradient-to-r from-red-500 to-red-600' :
              tokens <= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
              'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
            style={{ width: `${Math.min((tokens / 1000) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
      
      {subscription?.plan === 'Free' && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-blue-300">Upgrade to Pro</div>
              <div className="text-xs text-blue-400">Get 10x more tokens and premium features</div>
            </div>
          </div>
        </div>
      )}
      
      {tokens <= 50 && subscription?.plan !== 'Free' && (
        <div className="mt-4 p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-orange-300">Low Token Balance</div>
              <div className="text-xs text-orange-400">Your tokens will reset next billing cycle</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
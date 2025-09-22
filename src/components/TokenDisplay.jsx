import React from 'react';
import { usePayment } from '../context/PaymentContext';
import { Zap, AlertTriangle, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TokenDisplay({ className = '', showUpgrade = true }) {
  const { userSubscription, remainingTokens, SUBSCRIPTION_PLANS } = usePayment();
  
  const currentPlan = userSubscription ? SUBSCRIPTION_PLANS[userSubscription.planId] : SUBSCRIPTION_PLANS.free;
  const tokenPercentage = currentPlan ? (remainingTokens / currentPlan.tokens) * 100 : 0;
  
  const getStatusColor = () => {
    if (tokenPercentage > 50) return 'text-green-400';
    if (tokenPercentage > 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBarColor = () => {
    if (tokenPercentage > 50) return 'bg-green-500';
    if (tokenPercentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-black-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className={`w-5 h-5 ${getStatusColor()}`} />
          <span className="font-semibold text-white">Tokens</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${getStatusColor()}`}>
            {remainingTokens}
          </span>
          <span className="text-gray-400">/ {currentPlan?.tokens}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.max(0, tokenPercentage)}%` }}
        ></div>
      </div>
      
      {/* Plan Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Plan:</span>
          <span className="text-white font-medium">{currentPlan?.name}</span>
          {currentPlan?.icon && <span className="ml-1">{currentPlan.icon}</span>}
        </div>
        
        {tokenPercentage < 20 && showUpgrade && (
          <Link
            to="/subscription"
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Upgrade</span>
          </Link>
        )}
      </div>
      
      {/* Low Token Warning */}
      {tokenPercentage < 10 && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Running low on tokens!</span>
          </div>
          {showUpgrade && (
            <Link
              to="/subscription"
              className="mt-2 block w-full bg-red-500 hover:bg-red-600 text-white text-center py-1 px-3 rounded text-xs font-medium transition-colors"
            >
              Upgrade Now
            </Link>
          )}
        </div>
      )}
      
      {/* Zero Tokens Warning */}
      {remainingTokens === 0 && (
        <div className="mt-3 p-2 bg-red-600/20 border border-red-500 rounded-lg">
          <div className="text-red-400 text-sm font-medium text-center">
            No tokens remaining!
          </div>
          {showUpgrade && (
            <Link
              to="/subscription"
              className="mt-2 block w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-center py-2 px-3 rounded font-medium transition-all"
            >
              <Crown className="w-4 h-4 inline mr-1" />
              Upgrade Plan
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for headers/navbars
export function TokenDisplayCompact({ className = '' }) {
  const { remainingTokens, SUBSCRIPTION_PLANS, userSubscription } = usePayment();
  
  const currentPlan = userSubscription ? SUBSCRIPTION_PLANS[userSubscription.planId] : SUBSCRIPTION_PLANS.free;
  const tokenPercentage = currentPlan ? (remainingTokens / currentPlan.tokens) * 100 : 0;
  
  const getStatusColor = () => {
    if (tokenPercentage > 50) return 'text-green-400';
    if (tokenPercentage > 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Zap className={`w-4 h-4 ${getStatusColor()}`} />
      <span className={`font-semibold ${getStatusColor()}`}>
        {remainingTokens}
      </span>
      <span className="text-gray-400 text-sm">tokens</span>
      {tokenPercentage < 20 && (
        <Link
          to="/subscription"
          className="text-purple-400 hover:text-purple-300 text-xs"
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}
import React from 'react';
import { usePayment } from '../context/PaymentContext';
import { Zap, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TokenCostBanner({ service, className = '' }) {
  const { SERVICE_TOKEN_COSTS, checkTokensAvailable, remainingTokens } = usePayment();
  
  const cost = SERVICE_TOKEN_COSTS[service] || 1;
  const canUse = checkTokensAvailable(service);
  
  if (canUse) {
    return (
      <div className={`bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center gap-3 ${className}`}>
        <Zap className="w-5 h-5 text-blue-400" />
        <div className="flex-1">
          <div className="text-blue-300 font-medium">
            This service costs {cost} token{cost > 1 ? 's' : ''} per use
          </div>
          <div className="text-blue-400/70 text-sm">
            You have {remainingTokens} tokens remaining
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 ${className}`}>
      <AlertTriangle className="w-5 h-5 text-red-400" />
      <div className="flex-1">
        <div className="text-red-300 font-medium">
          Insufficient tokens! Need {cost} token{cost > 1 ? 's' : ''} to use this service
        </div>
        <div className="text-red-400/70 text-sm">
          You have {remainingTokens} tokens remaining
        </div>
      </div>
      <Link
        to="/subscription"
        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Upgrade Plan
      </Link>
    </div>
  );
}
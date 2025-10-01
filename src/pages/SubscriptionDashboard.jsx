import React, { useState, useEffect } from 'react';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import {
  Check
} from 'lucide-react';

export default function SubscriptionDashboard() {
  const { currentUser } = useAuth();
  const {
    userSubscription,
    remainingTokens,
    paymentHistory,
    SUBSCRIPTION_PLANS,
    upgradeSubscription,
    handlePaymentSuccess,
    loading
  } = usePayment();

  const [upgradingPlan, setUpgradingPlan] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [justUpgraded, setJustUpgraded] = useState(false);

  const currentPlan = userSubscription ? SUBSCRIPTION_PLANS[userSubscription.planId] : SUBSCRIPTION_PLANS.free;
  const tokenUsagePercentage = currentPlan ? ((currentPlan.tokens - remainingTokens) / currentPlan.tokens) * 100 : 0;

  // Handle upgrade button click - redirects to Stripe checkout
  const handleUpgrade = async (planId) => {
    if (planId === 'free') return;
    
    setUpgradingPlan(planId);
    setErrorMessage('');
    
    try {
      await upgradeSubscription(planId);
      // User will be redirected to Stripe checkout page
    } catch (error) {
      console.error('Upgrade failed:', error);
      setErrorMessage(error.message || 'Failed to start upgrade process. Please try again.');
      setUpgradingPlan(null);
    }
  };

  // Handle return from Stripe checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const planId = urlParams.get('plan');

    console.log('URL params:', { sessionId, success, canceled, planId });

    // Check localStorage for pending upgrade if URL params are missing
    let upgradePlan = planId;
    if (!planId) {
      const pendingUpgrade = localStorage.getItem('pendingUpgrade');
      if (pendingUpgrade) {
        try {
          const parsed = JSON.parse(pendingUpgrade);
          upgradePlan = parsed.planId;
          console.log('Found pending upgrade in localStorage:', parsed);
        } catch (e) {
          console.error('Failed to parse pending upgrade:', e);
        }
      }
    }

    if (success === 'true' && upgradePlan) {
      console.log(`Processing successful payment return for plan: ${upgradePlan}`);
      setUpgradingPlan(null);
      
      // Clear pending upgrade from localStorage
      localStorage.removeItem('pendingUpgrade');
      
      handlePaymentSuccess(sessionId, upgradePlan)
        .then((result) => {
          if (result) {
            const planName = SUBSCRIPTION_PLANS[upgradePlan]?.name || upgradePlan;
            setSuccessMessage(`🎉 Welcome to ${planName}! Your subscription has been upgraded and tokens have been refreshed.`);
            setJustUpgraded(true);
            console.log('Payment processing completed successfully');
            
            // Show success for longer since it's an important event
            setTimeout(() => {
              setJustUpgraded(false);
            }, 10000); // 10 seconds
          } else {
            setErrorMessage('⚠️ Payment verification failed. Please contact support if your payment was charged.');
          }
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((error) => {
          console.error('Payment success handling failed:', error);
          setErrorMessage('❌ Failed to complete upgrade. Please contact support if your payment was charged.');
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (canceled === 'true') {
      setErrorMessage('💳 Payment was canceled. You can try again anytime.');
      setUpgradingPlan(null);
      console.log('Payment was canceled by user');
      // Clear pending upgrade from localStorage
      localStorage.removeItem('pendingUpgrade');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'true' && !upgradePlan) {
      // Success but no plan identified - try to handle gracefully
      console.warn('Payment success detected but no plan identified');
      setErrorMessage('⚠️ Payment completed but plan details were lost. Please contact support.');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handlePaymentSuccess, SUBSCRIPTION_PLANS]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <Header />
        <div className="relative z-10 animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Header */}
      <Header />

      {/* Success/Error Messages */}
      {(successMessage || errorMessage) && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className={`p-4 rounded-lg shadow-lg ${
            successMessage 
              ? 'bg-green-600 border border-green-500' 
              : 'bg-red-600 border border-red-500'
          }`}>
            <p className="text-white font-semibold">
              {successMessage || errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Just Upgraded Celebration Banner */}
      {justUpgraded && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-green-400">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Upgrade Successful!</h2>
            <p className="text-green-100 mb-4">
              Welcome to {currentPlan.name}! Your subscription has been activated and your tokens have been refreshed.
            </p>
            <div className="bg-white/20 rounded-lg p-3 mb-4">
              <p className="text-white font-semibold">
                {remainingTokens.toLocaleString()} tokens available
              </p>
            </div>
            <button
              onClick={() => setJustUpgraded(false)}
              className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
      
      <div className="relative container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Subscription Dashboard
          </h1>
          <p className="text-gray-300 text-lg">
            Manage your subscription and track your AI service usage
          </p>
        </div>

        {/* Current Plan Card */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className={`bg-gradient-to-r ${currentPlan.color} rounded-3xl p-8 shadow-2xl border border-white/20 ${justUpgraded ? 'ring-4 ring-green-400 ring-opacity-75 animate-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{currentPlan.icon}</div>
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {currentPlan.name}
                    {justUpgraded && <span className="text-sm bg-green-500 text-white px-2 py-1 rounded-full">✨ Just Upgraded!</span>}
                  </h2>
                  <p className="text-white/80">Your current plan</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">${currentPlan.price}</div>
                <div className="text-white/80">per month</div>
              </div>
            </div>

            {/* Token Usage */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold">Tokens Remaining</span>
                <span className="text-lg">{remainingTokens} / {currentPlan.tokens}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${Math.max(0, ((remainingTokens / currentPlan.tokens) * 100))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-white/70 mt-1">
                <span>{tokenUsagePercentage.toFixed(1)}% used</span>
                <span>{remainingTokens} tokens left</span>
              </div>
            </div>

            {/* Service Usage Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🎭</div>
                <div className="text-sm text-white/80">Metaphor Classifier</div>
                <div className="font-semibold">1 token/line</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🎵</div>
                <div className="text-sm text-white/80">Lyric Generator</div>
                <div className="font-semibold">1 token/lyric</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">✨</div>
                <div className="text-sm text-white/80">Metaphor Creator</div>
                <div className="font-semibold">1 token/metaphor</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🕵️‍♂️</div>
                <div className="text-sm text-white/80">Masking Predict</div>
                <div className="font-semibold">mask count × suggestion count</div>
              </div>
            </div>

            {/* Pricing Explanation */}
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
              <h3 className="text-lg font-semibold text-blue-200 mb-2 flex items-center">
                <span className="text-xl mr-2">💡</span>
                How Dynamic Pricing Works
              </h3>
              <div className="text-sm text-blue-100/80 space-y-1">
                <p>• <strong>Metaphor Classifier:</strong> Pay 1 token per line of text you analyze</p>
                <p>• <strong>Lyric Generator:</strong> Pay 1 token per lyric generated (choose 1-5 lyrics)</p>
                <p>• <strong>Metaphor Creator:</strong> Pay 1 token per metaphor created (choose 1-5 metaphors)</p>
                <p>• <strong>Masking Predict:</strong> Cost = mask count × suggestion count tokens (choose 2-10 suggestions)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? 'border-purple-500 shadow-lg shadow-purple-500/25'
                    : 'border-gray-700 hover:border-blue-500'
                } ${userSubscription?.planId === plan.id ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                {userSubscription?.planId === plan.id && (
                  <div className="absolute -top-3 right-3">
                    <div className="bg-green-500 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{plan.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-1">${plan.price}</div>
                  <div className="text-gray-400">per month</div>
                </div>

                <div className="mb-6">
                  <div className="text-center mb-4">
                    <span className="text-2xl font-bold text-blue-400">{plan.tokens.toLocaleString()}</span>
                    <span className="text-gray-400 ml-2">tokens</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.id === 'free' ? (
                  // Free plan - no upgrade button, just informational
                  <div className="w-full py-3 px-4 rounded-lg font-semibold text-center bg-gray-600 text-gray-300 cursor-default">
                    {userSubscription?.planId === 'free' ? 'Current Plan' : 'Free Plan'}
                  </div>
                ) : (
                  // Paid plans - upgrade button
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={userSubscription?.planId === plan.id || upgradingPlan === plan.id}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      userSubscription?.planId === plan.id
                        ? 'bg-green-600 text-white cursor-default'
                        : plan.popular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {userSubscription?.planId === plan.id 
                      ? 'Current Plan' 
                      : upgradingPlan === plan.id 
                      ? 'Redirecting to Stripe...' 
                      : `Upgrade to ${plan.name}`
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Payment History</h2>
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left">Date</th>
                      <th className="px-6 py-4 text-left">Plan</th>
                      <th className="px-6 py-4 text-left">Amount</th>
                      <th className="px-6 py-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-t border-gray-700">
                        <td className="px-6 py-4">
                          {payment.timestamp?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="capitalize">{payment.planId}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold">${payment.amount}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            payment.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="relative text-center py-16 text-gray-400 border-t border-gray-800/50 mt-auto backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="relative z-10">
          <p className="mb-6 text-lg font-medium">
            <span className="text-white">Tamil AI Models</span> &copy; 2025 | Created by
            <span className="text-violet-400 font-semibold"> Group-23</span>
          </p>
          <div className="flex justify-center space-x-8 mt-8">
            {[
              {
                icon: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
                color: "hover:text-violet-400",
                label: "GitHub",
              },
              {
                icon: "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84",
                color: "hover:text-emerald-400",
                label: "Twitter",
              },
              {
                icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                color: "hover:text-pink-400",
                label: "Instagram",
              },
            ].map((social, idx) => (
              <a
                key={idx}
                href="#"
                className={`group text-gray-500 ${social.color} transition-all duration-300 transform hover:scale-110`}
              >
                <span className="sr-only">{social.label}</span>
                <div className="relative">
                  <div className="absolute inset-0 bg-current opacity-20 rounded-full blur-lg scale-150 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <svg className="relative h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d={social.icon} clipRule="evenodd" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
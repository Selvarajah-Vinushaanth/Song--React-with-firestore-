import React, { useState, useEffect } from 'react';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import {
  CreditCard,
  Zap,
  Star,
  Crown,
  Check,
  X,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Shield,
  Sparkles
} from 'lucide-react';

export default function SubscriptionDashboard() {
  const { currentUser } = useAuth();
  const {
    userSubscription,
    remainingTokens,
    paymentHistory,
    SUBSCRIPTION_PLANS,
    upgradeSubscription,
    loading
  } = usePayment();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const currentPlan = userSubscription ? SUBSCRIPTION_PLANS[userSubscription.planId] : SUBSCRIPTION_PLANS.free;
  const tokenUsagePercentage = currentPlan ? ((currentPlan.tokens - remainingTokens) / currentPlan.tokens) * 100 : 0;

  const handleUpgrade = (planId) => {
    setSelectedPlan(SUBSCRIPTION_PLANS[planId]);
    setShowPaymentModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);

    try {
      await upgradeSubscription(selectedPlan.id, paymentForm);
      setShowPaymentModal(false);
      setPaymentForm({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: ''
      });
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

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
          <div className={`bg-gradient-to-r ${currentPlan.color} rounded-3xl p-8 shadow-2xl border border-white/20`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{currentPlan.icon}</div>
                <div>
                  <h2 className="text-2xl font-bold">{currentPlan.name}</h2>
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
                <div className="font-semibold">1 token/suggestion</div>
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
                <p>• <strong>Masking Predict:</strong> Pay 1 token per suggestion requested (choose 2-10 suggestions)</p>
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

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={userSubscription?.planId === plan.id}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                    userSubscription?.planId === plan.id
                      ? 'bg-green-600 text-white cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {userSubscription?.planId === plan.id ? 'Current Plan' : 'Upgrade'}
                </button>
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Upgrade to {selectedPlan?.name}</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">${selectedPlan?.price}</div>
                <div className="text-white/80">per month</div>
              </div>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={paymentForm.cardholderName}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, cardholderName: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={paymentForm.cardNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={paymentForm.expiryDate}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, expiryDate: formatExpiryDate(e.target.value) }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="MM/YY"
                    maxLength="5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={paymentForm.cvv}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123"
                    maxLength="4"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentLoading ? 'Processing...' : `Pay $${selectedPlan?.price}`}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-400">
              <p>🔒 Secure payment processing</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
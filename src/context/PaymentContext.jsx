import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './AuthContext';
import getStripe, { STRIPE_CONFIG } from '../config/stripe';

const PaymentContext = createContext();

export function usePayment() {
  return useContext(PaymentContext);
}

// Subscription plans
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    tokens: 100,
    features: [
      '100 tokens per month',
      'Access to all 4 services',
      'Dynamic pricing (pay per output)',
      'Basic support',
      'Chat history'
    ],
    color: 'from-gray-500 to-gray-600',
    icon: '🆓',
    popular: false
  },
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    price: 9.99,
    tokens: 1000,
    features: [
      '1,000 tokens per month',
      'Access to all 4 services',
      'Dynamic pricing (pay per output)',
      'Priority support',
      'Advanced analytics',
      'Export functionality'
    ],
    color: 'from-blue-500 to-blue-600',
    icon: '⭐',
    popular: false
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    price: 19.99,
    tokens: 5000,
    features: [
      '5,000 tokens per month',
      'Access to all 4 services',
      'Dynamic pricing (pay per output)',
      'Premium support',
      'Advanced analytics',
      'Bulk operations',
      'API access'
    ],
    color: 'from-purple-500 to-purple-600',
    icon: '🚀',
    popular: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 49.99,
    tokens: 20000,
    features: [
      '20,000 tokens per month',
      'Access to all 4 services',
      'Dynamic pricing (pay per output)',
      '24/7 priority support',
      'Custom integrations',
      'White-label options',
      'Dedicated account manager'
    ],
    color: 'from-amber-500 to-orange-500',
    icon: '👑',
    popular: false
  }
};

// Plan hierarchy for upgrade/downgrade logic
const PLAN_HIERARCHY = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3
};

// Get available plans for upgrade based on current plan
const getAvailablePlans = (currentPlanId) => {
  if (!currentPlanId || currentPlanId === 'free') {
    // Free users can choose any paid plan
    return ['basic', 'pro', 'enterprise'];
  }
  
  const currentLevel = PLAN_HIERARCHY[currentPlanId];
  const availablePlans = [];
  
  // Add all plans with higher level (upgrades only)
  Object.keys(PLAN_HIERARCHY).forEach(planId => {
    if (PLAN_HIERARCHY[planId] > currentLevel) {
      availablePlans.push(planId);
    }
  });
  
  return availablePlans;
};

// Check if a plan change is allowed
const isPlanChangeAllowed = (currentPlanId, targetPlanId) => {
  if (!currentPlanId || currentPlanId === 'free') {
    // Free users can upgrade to any paid plan
    return targetPlanId !== 'free';
  }
  
  const currentLevel = PLAN_HIERARCHY[currentPlanId];
  const targetLevel = PLAN_HIERARCHY[targetPlanId];
  
  // Only allow upgrades (higher level plans)
  return targetLevel > currentLevel;
};

// Token costs per service
const SERVICE_TOKEN_COSTS = {
  'metaphor-classifier': 1,
  'lyric-generator': 3,
  'metaphor-creator': 2,
  'masking-predict': 1
};

export function PaymentProvider({ children }) {
  const { currentUser } = useAuth();
  const [userSubscription, setUserSubscription] = useState(null);
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Initialize user subscription
  const initializeUserSubscription = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user with free plan
        console.log('Creating new user with free plan for userId:', userId);
        const newUserData = {
          subscription: {
            planId: 'free',
            status: 'active',
            startDate: serverTimestamp(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            tokensRemaining: SUBSCRIPTION_PLANS.free.tokens,
            tokensUsed: 0,
            autoRenew: true
          },
          profile: {
            email: currentUser?.email || 'user@example.com',
            displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
            createdAt: serverTimestamp()
          }
        };
        
        await setDoc(userDocRef, newUserData);
        setUserSubscription(newUserData.subscription);
        setRemainingTokens(newUserData.subscription.tokensRemaining);
        console.log('Successfully created new user with free plan:', newUserData);
        
        // You could add a toast notification here if you want to inform the user
        // toast.success('Welcome! You have been assigned to the Free plan with 100 tokens.');
      } else {
        console.log('Existing user found, loading subscription data');
        const userData = userDoc.data();
        setUserSubscription(userData.subscription);
        setRemainingTokens(userData.subscription.tokensRemaining || 0);
      }
    } catch (error) {
      console.error('Error initializing user subscription:', error);
      // Fallback to default free plan if there's an error
      const fallbackSubscription = {
        planId: 'free',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tokensRemaining: SUBSCRIPTION_PLANS.free.tokens,
        tokensUsed: 0,
        autoRenew: true
      };
      setUserSubscription(fallbackSubscription);
      setRemainingTokens(SUBSCRIPTION_PLANS.free.tokens);
    }
  };

  // Manually assign free plan to current user (useful for testing or troubleshooting)
  const assignFreePlan = async () => {
    if (!currentUser) {
      console.error('No current user to assign free plan to');
      return false;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const freePlanData = {
        subscription: {
          planId: 'free',
          status: 'active',
          startDate: serverTimestamp(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          tokensRemaining: SUBSCRIPTION_PLANS.free.tokens,
          tokensUsed: 0,
          autoRenew: true
        },
        profile: {
          email: currentUser?.email || 'user@example.com',
          displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
          createdAt: serverTimestamp()
        }
      };

      await setDoc(userDocRef, freePlanData, { merge: true });
      setUserSubscription(freePlanData.subscription);
      setRemainingTokens(freePlanData.subscription.tokensRemaining);
      
      console.log('Successfully assigned free plan to user');
      return true;
    } catch (error) {
      console.error('Error assigning free plan:', error);
      return false;
    }
  };

  // Check if user has enough tokens for a service
  const checkTokensAvailable = (serviceOrTokenCount) => {
    // If it's a number, use it directly. If it's a string, look up the cost.
    const cost = typeof serviceOrTokenCount === 'number' 
      ? serviceOrTokenCount 
      : (SERVICE_TOKEN_COSTS[serviceOrTokenCount] || 1);
    return remainingTokens >= cost;
  };

  // Consume tokens for a service call
  const consumeTokens = async (serviceOrTokenCount, serviceName = null) => {
    if (!currentUser || !userSubscription) return false;

    // If first parameter is a number, use it directly. Otherwise look up the cost.
    const cost = typeof serviceOrTokenCount === 'number' 
      ? serviceOrTokenCount 
      : (SERVICE_TOKEN_COSTS[serviceOrTokenCount] || 1);
    
    // Use serviceName if provided, otherwise use serviceOrTokenCount if it's a string
    const service = serviceName || (typeof serviceOrTokenCount === 'string' ? serviceOrTokenCount : 'Unknown');
    
    if (remainingTokens < cost) {
      throw new Error('Insufficient tokens. Please upgrade your plan.');
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Update tokens in Firestore
      await updateDoc(userDocRef, {
        'subscription.tokensRemaining': increment(-cost),
        'subscription.tokensUsed': increment(cost)
      });

      // Update local state
      setRemainingTokens(prev => prev - cost);

      // Log usage
      await addDoc(collection(db, 'usage_logs'), {
        userId: currentUser.uid,
        service: service,
        tokensCost: cost,
        timestamp: serverTimestamp(),
        planId: userSubscription.planId
      });

      return true;
    } catch (error) {
      console.error('Error consuming tokens:', error);
      throw error;
    }
  };

  // Upgrade subscription using modern Stripe approach
  const upgradeSubscription = async (planId) => {
    if (!currentUser) {
      throw new Error('Please log in to upgrade your subscription');
    }

    if (planId === 'free') {
      throw new Error('Cannot upgrade to free plan');
    }

    // Check if this plan change is allowed
    const currentPlanId = userSubscription?.planId || 'free';
    if (!isPlanChangeAllowed(currentPlanId, planId)) {
      const currentPlanName = SUBSCRIPTION_PLANS[currentPlanId]?.name || 'Free Plan';
      const targetPlanName = SUBSCRIPTION_PLANS[planId]?.name || planId;
      throw new Error(`Cannot downgrade from ${currentPlanName} to ${targetPlanName}. You can only upgrade to higher plans.`);
    }

    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      
      // Check if Payment Link exists for this plan
      if (!STRIPE_CONFIG.paymentLinks[planId]) {
        throw new Error(`Payment link not configured for ${planId} plan. Please check your .env file.`);
      }

      const paymentLinkUrl = STRIPE_CONFIG.paymentLinks[planId];
      
      // Validate the URL format
      if (!paymentLinkUrl.includes('buy.stripe.com')) {
        throw new Error('Invalid Stripe Payment Link URL format');
      }

      console.log(`Redirecting to Stripe Payment Link for ${planId} plan:`, paymentLinkUrl);
      console.log(`Expected success URL should be: ${STRIPE_CONFIG.domain}/subscription-dashboard?success=true&plan=${planId}&session_id={CHECKOUT_SESSION_ID}`);
      
      // Store the attempted upgrade in localStorage for backup
      localStorage.setItem('pendingUpgrade', JSON.stringify({
        planId: planId,
        userId: currentUser.uid,
        timestamp: Date.now()
      }));
      
      // Direct redirect to Stripe Payment Link
      window.location.href = paymentLinkUrl;

      return { success: true };
    } catch (error) {
      console.error('Error creating Stripe checkout:', error);
      throw error;
    }
  };

  // Handle successful payment return from Stripe checkout
  const handlePaymentSuccess = async (sessionId, planId) => {
    console.log('🚀 handlePaymentSuccess called with:', { sessionId, planId, currentUser: currentUser?.uid });
    
    if (!currentUser || !planId) {
      console.error('❌ Missing required data for payment success handling:', { 
        currentUser: !!currentUser, 
        planId: planId 
      });
      return false;
    }

    try {
      console.log(`✅ Processing successful payment for user ${currentUser.uid}, plan: ${planId}, session: ${sessionId}`);
      
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      console.log('📋 Plan details:', plan);

      const userDocRef = doc(db, 'users', currentUser.uid);

      // Create new subscription object
      const newSubscription = {
        planId: planId,
        planName: plan.name,
        status: 'active',
        startDate: serverTimestamp(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        tokensRemaining: plan.tokens,
        tokensUsed: 0,
        autoRenew: true,
        stripeSessionId: sessionId || null,
        lastUpdated: serverTimestamp(),
        upgradedAt: serverTimestamp()
      };

      console.log('💾 Updating user subscription in Firebase...', newSubscription);

      // Update user subscription in Firebase
      await updateDoc(userDocRef, {
        subscription: newSubscription
      });

      console.log('✅ Successfully updated user subscription in Firebase');

      // Check if payment already exists to prevent duplicates
      if (sessionId) {
        const existingPaymentQuery = query(
          collection(db, 'payments'),
          where('stripeSessionId', '==', sessionId),
          where('userId', '==', currentUser.uid)
        );
        
        const existingPayments = await getDocs(existingPaymentQuery);
        
        if (!existingPayments.empty) {
          console.log('⚠️ Payment already exists for session:', sessionId);
          // Update local state but don't create duplicate payment record
          setUserSubscription(newSubscription);
          setRemainingTokens(plan.tokens);
          await fetchPaymentHistory();
          setLoading(false);
          return true;
        }
      }

      // Log payment in payments collection
      const paymentData = {
        userId: currentUser.uid,
        planId: planId,
        planName: plan.name,
        amount: plan.price,
        stripeSessionId: sessionId || null,
        status: 'completed',
        timestamp: serverTimestamp(),
        userEmail: currentUser.email
      };

      console.log('💰 Logging payment in Firebase...', paymentData);

      await addDoc(collection(db, 'payments'), paymentData);
      console.log('✅ Successfully logged payment in Firebase');

      // Update local state immediately
      console.log('🔄 Updating local state...');
      setUserSubscription(newSubscription);
      setRemainingTokens(plan.tokens);
      
      // Refresh payment history
      console.log('📋 Refreshing payment history...');
      await fetchPaymentHistory();
      
      // Force re-render by updating loading state
      setLoading(false);
      
      console.log('🎉 Payment success handling completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error handling payment success:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  };

  // Verify payment session (optional - for additional security)
  const verifyPaymentSession = async (sessionId) => {
    try {
      // In a production app, you might want to verify the session with Stripe API
      // For now, we'll trust the session_id from the URL
      console.log('Session verification would happen here for:', sessionId);
      return true;
    } catch (error) {
      console.error('Error verifying payment session:', error);
      return false;
    }
  };

  // Get payment history
  const fetchPaymentHistory = async () => {
    if (!currentUser) return;

    try {
      // Simplified query - just filter by userId, then sort in memory
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('userId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(paymentsQuery);
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Remove duplicates based on stripeSessionId
      const uniquePayments = [];
      const seenSessionIds = new Set();
      
      for (const payment of payments) {
        if (payment.stripeSessionId) {
          if (!seenSessionIds.has(payment.stripeSessionId)) {
            seenSessionIds.add(payment.stripeSessionId);
            uniquePayments.push(payment);
          } else {
            console.log('🔍 Found duplicate payment, skipping:', payment.id);
          }
        } else {
          // Keep payments without session IDs (legacy or manual payments)
          uniquePayments.push(payment);
        }
      }
      
      // Sort by timestamp in memory to avoid index requirement
      uniquePayments.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.toDate() - a.timestamp.toDate();
      });
      
      setPaymentHistory(uniquePayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]); // Set empty array on error
    }
  };

  // Check and handle subscription expiration
  const checkSubscriptionStatus = async () => {
    if (!currentUser || !userSubscription) return;

    try {
      const now = new Date();
      const endDate = userSubscription.endDate instanceof Date ? 
        userSubscription.endDate : 
        userSubscription.endDate?.toDate();

      if (!endDate) return; // No end date means no expiration

      console.log('🔍 Checking subscription status:', {
        planId: userSubscription.planId,
        endDate: endDate.toISOString(),
        now: now.toISOString(),
        expired: now > endDate
      });

      const userDocRef = doc(db, 'users', currentUser.uid);

      if (now > endDate) {
        // Subscription has expired
        if (userSubscription.planId === 'free') {
          // Free plan users get token refresh
          console.log('🔄 Refreshing tokens for free plan user');
          const freeTokens = SUBSCRIPTION_PLANS.free.tokens;
          
          const updatedSubscription = {
            ...userSubscription,
            tokensRemaining: freeTokens,
            tokensUsed: 0,
            startDate: serverTimestamp(),
            endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Next month
            lastUpdated: serverTimestamp()
          };

          await updateDoc(userDocRef, {
            subscription: updatedSubscription
          });

          setUserSubscription(updatedSubscription);
          setRemainingTokens(freeTokens);
          
        } else {
          // Paid plan users downgrade to free
          console.log('⬇️ Downgrading expired paid subscription to free plan');
          const freeTokens = SUBSCRIPTION_PLANS.free.tokens;
          
          const downgradedSubscription = {
            planId: 'free',
            planName: SUBSCRIPTION_PLANS.free.name,
            status: 'active',
            startDate: serverTimestamp(),
            endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Next month
            tokensRemaining: freeTokens,
            tokensUsed: 0,
            autoRenew: false,
            lastUpdated: serverTimestamp(),
            downgradedFrom: userSubscription.planId,
            downgradedAt: serverTimestamp()
          };

          await updateDoc(userDocRef, {
            subscription: downgradedSubscription
          });

          setUserSubscription(downgradedSubscription);
          setRemainingTokens(freeTokens);
        }
      } else {
        // Subscription is still active - check if it's a new month for free users
        if (userSubscription.planId === 'free') {
          const startDate = userSubscription.startDate instanceof Date ? 
            userSubscription.startDate : 
            userSubscription.startDate?.toDate();
          
          const daysSinceStart = startDate ? (now - startDate) / (1000 * 60 * 60 * 24) : 0;
          
          // If it's been 30+ days since start, refresh free tokens
          if (daysSinceStart >= 30) {
            console.log('🔄 Monthly token refresh for free plan user');
            const freeTokens = SUBSCRIPTION_PLANS.free.tokens;
            
            const refreshedSubscription = {
              ...userSubscription,
              tokensRemaining: freeTokens,
              tokensUsed: 0,
              startDate: serverTimestamp(),
              lastUpdated: serverTimestamp()
            };

            await updateDoc(userDocRef, {
              subscription: refreshedSubscription
            });

            setUserSubscription(refreshedSubscription);
            setRemainingTokens(freeTokens);
          }
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  // Load user data when user changes
  useEffect(() => {
    const handleUserLogin = async () => {
      if (currentUser) {
        console.log('User logged in, initializing subscription for:', currentUser.uid);
        await initializeUserSubscription(currentUser.uid);
        await fetchPaymentHistory();
        // Check subscription status after loading
        setTimeout(() => checkSubscriptionStatus(), 1000);
      } else {
        console.log('User logged out, clearing subscription data');
        setUserSubscription(null);
        setRemainingTokens(0);
        setPaymentHistory([]);
      }
      setLoading(false);
    };

    handleUserLogin();
  }, [currentUser]);

  // Check subscription status periodically (every 5 minutes)
  useEffect(() => {
    if (!currentUser || !userSubscription) return;

    const interval = setInterval(() => {
      checkSubscriptionStatus();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [currentUser, userSubscription]);

  const value = {
    userSubscription,
    remainingTokens,
    paymentHistory,
    loading,
    SUBSCRIPTION_PLANS,
    SERVICE_TOKEN_COSTS,
    checkTokensAvailable,
    consumeTokens,
    upgradeSubscription,
    handlePaymentSuccess,
    verifyPaymentSession,
    checkSubscriptionStatus,
    fetchPaymentHistory,
    assignFreePlan,
    getAvailablePlans,
    isPlanChangeAllowed
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
}
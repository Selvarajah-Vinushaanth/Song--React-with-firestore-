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

  // Upgrade subscription
  const upgradeSubscription = async (planId, paymentDetails) => {
    if (!currentUser) return false;

    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      const userDocRef = doc(db, 'users', currentUser.uid);

      // Simulate payment processing (replace with actual payment gateway)
      const paymentResult = await processPayment(paymentDetails, plan.price);
      
      if (paymentResult.success) {
        const newSubscription = {
          planId: planId,
          status: 'active',
          startDate: serverTimestamp(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          tokensRemaining: plan.tokens,
          tokensUsed: 0,
          autoRenew: true,
          paymentId: paymentResult.paymentId
        };

        await updateDoc(userDocRef, {
          subscription: newSubscription
        });

        // Log payment
        await addDoc(collection(db, 'payments'), {
          userId: currentUser.uid,
          planId: planId,
          amount: plan.price,
          paymentId: paymentResult.paymentId,
          status: 'completed',
          timestamp: serverTimestamp()
        });

        setUserSubscription(newSubscription);
        setRemainingTokens(plan.tokens);
        
        return true;
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
    
    return false;
  };

  // Simulate payment processing (replace with Stripe, PayPal, etc.)
  const processPayment = async (paymentDetails, amount) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: 'pay_' + Math.random().toString(36).substr(2, 9),
          amount: amount
        });
      }, 2000);
    });
  };

  // Get payment history
  const fetchPaymentHistory = async () => {
    if (!currentUser) return;

    try {
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(paymentsQuery);
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPaymentHistory(payments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  // Reset tokens (for monthly renewal)
  const resetMonthlyTokens = async () => {
    if (!currentUser || !userSubscription) return;

    try {
      const plan = SUBSCRIPTION_PLANS[userSubscription.planId];
      const userDocRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userDocRef, {
        'subscription.tokensRemaining': plan.tokens,
        'subscription.tokensUsed': 0,
        'subscription.startDate': serverTimestamp(),
        'subscription.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      setRemainingTokens(plan.tokens);
    } catch (error) {
      console.error('Error resetting monthly tokens:', error);
    }
  };

  // Load user data when user changes
  useEffect(() => {
    const handleUserLogin = async () => {
      if (currentUser) {
        console.log('User logged in, initializing subscription for:', currentUser.uid);
        await initializeUserSubscription(currentUser.uid);
        await fetchPaymentHistory();
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
    resetMonthlyTokens,
    fetchPaymentHistory,
    assignFreePlan
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
}
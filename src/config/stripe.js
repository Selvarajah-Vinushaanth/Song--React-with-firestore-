import { loadStripe } from '@stripe/stripe-js';

// Stripe configuration
export const STRIPE_CONFIG = {
  // Replace with your actual Stripe publishable key
  publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51PP35AKWzEZtJuIAy0yFgd4LTRbC2s4hqAxMbyIpbk574SrIEoIXep9L6YpsAzjYy78tHHHhQwOSwdfIK4gdwrHw00Y6lyXMIu',
  
  // Payment Links for your subscription plans (get these from Stripe Dashboard)
  paymentLinks: {
    basic: process.env.REACT_APP_STRIPE_BASIC_PAYMENT_LINK || 'https://buy.stripe.com/test_dRm8wQ91mfjn2Df5bR9k400',
    pro: process.env.REACT_APP_STRIPE_PRO_PAYMENT_LINK || 'https://buy.stripe.com/test_aFafZicdydbfa5HfQv9k401', 
    enterprise: process.env.REACT_APP_STRIPE_ENTERPRISE_PAYMENT_LINK || 'https://buy.stripe.com/test_dRmeVefpK1sx5PrgUz9k402'
  },
  
  // Your domain for redirect URLs
  domain: process.env.REACT_APP_DOMAIN || 'http://localhost:3000'
};

// Initialize Stripe
let stripePromise;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);
  }
  return stripePromise;
};

export default getStripe;
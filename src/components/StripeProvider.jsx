import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import getStripe from '../config/stripe';

const StripeProvider = ({ children }) => {
  return (
    <Elements stripe={getStripe()}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
# Stripe Payment Links Configuration Guide

## Required Setup for Firebase Integration

### 1. Configure Payment Links in Stripe Dashboard

For each payment link (Basic, Pro, Enterprise), you need to set these URLs:

**For Pro Plan Success URL:**
```
http://localhost:3000/subscription-dashboard?success=true&plan=pro&session_id={CHECKOUT_SESSION_ID}
```

**For Basic Plan Success URL:**
```
http://localhost:3000/subscription-dashboard?success=true&plan=basic&session_id={CHECKOUT_SESSION_ID}
```

**For Enterprise Plan Success URL:**
```
http://localhost:3000/subscription-dashboard?success=true&plan=enterprise&session_id={CHECKOUT_SESSION_ID}
```

**Cancel URL (same for all plans):**
```
http://localhost:3000/subscription-dashboard?canceled=true
```

### 2. Steps to Configure in Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Navigate to **Products** → Select your subscription product
3. Click **Payment Links** → Edit your payment link
4. In the "After payment" section:
   - **Success URL**: `http://localhost:3000/subscription-dashboard?success=true&plan=pro&session_id={CHECKOUT_SESSION_ID}`
   - **Cancel URL**: `http://localhost:3000/subscription-dashboard?canceled=true`
5. Click **Save**

### 3. For Production
Replace `http://localhost:3000` with your actual domain:
```
https://yourdomain.com/subscription-dashboard?success=true&plan=pro&session_id={CHECKOUT_SESSION_ID}
```

### 4. Testing the Flow

1. Click "Upgrade to Pro" button
2. Complete payment on Stripe page
3. Get redirected back to your app
4. Check Firebase console to see updated user subscription
5. Verify tokens are updated in the dashboard

### 5. Firebase Data Structure

After successful payment, this data is stored in Firebase:

**Users Collection (`/users/{userId}`):**
```json
{
  "subscription": {
    "planId": "pro",
    "planName": "Pro Plan",
    "status": "active",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-02-01T00:00:00Z", 
    "tokensRemaining": 5000,
    "tokensUsed": 0,
    "autoRenew": true,
    "stripeSessionId": "cs_test_...",
    "lastUpdated": "2025-01-01T00:00:00Z"
  }
}
```

**Payments Collection (`/payments/{paymentId}`):**
```json
{
  "userId": "user123",
  "planId": "pro",
  "planName": "Pro Plan",
  "amount": 19.99,
  "stripeSessionId": "cs_test_...",
  "status": "completed",
  "timestamp": "2025-01-01T00:00:00Z",
  "userEmail": "user@example.com"
}
```
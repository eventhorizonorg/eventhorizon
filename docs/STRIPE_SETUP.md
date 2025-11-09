# Stripe Donation Integration Setup Guide

## Where to Put Stripe Environment Variables

### 1. Create `.env.local` file (if it doesn't exist)

In your `eventhorizon/` directory, create a file named `.env.local`. This file is already in `.gitignore` so it won't be committed to git.

```bash
cd eventhorizon
touch .env.local
```

### 2. Add Stripe Keys to `.env.local`

Add the following to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...  # or sk_test_... for test mode
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # or pk_test_... for test mode
STRIPE_WEBHOOK_SECRET=whsec_...  # Only needed if implementing webhooks
```

## Where to Find Stripe Keys

### 1. Stripe Secret Key & Publishable Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API keys**
3. You'll see:
   - **Publishable key** (starts with `pk_live_` or `pk_test_`)
   - **Secret key** (starts with `sk_live_` or `sk_test_`) - Click "Reveal" to see it

**Important Notes:**
- Use **Test mode** keys for development (`pk_test_` and `sk_test_`)
- Use **Live mode** keys for production (`pk_live_` and `sk_live_`)
- Toggle between test/live mode using the toggle in the top right of Stripe Dashboard

### 2. Webhook Secret (Optional - Only if implementing webhooks)

The webhook secret is created when you set up a webhook endpoint:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL: `https://yourdomain.com/api/donations/webhook`
5. Select events to listen for (e.g., `checkout.session.completed`)
6. Click **Add endpoint**
7. Click on the newly created endpoint
8. In the **Signing secret** section, click **Reveal** to see the webhook secret (starts with `whsec_`)

**Note:** For local development, you can use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:3000/api/donations/webhook
```
This will give you a webhook secret that starts with `whsec_` for local testing.

## Current Implementation Status

### ✅ What Works Without Additional Setup:
- **Preset amounts** ($3, $5, $10, $25, $50) work immediately using Payment Links
- No environment variables needed for preset amounts

### ⚠️ What Requires Setup:
- **Custom amounts** require `STRIPE_SECRET_KEY` in `.env.local`
- The checkout API route (`/api/donations/create-checkout`) needs the secret key to create checkout sessions

### 📝 Optional:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Only needed if you want to use Stripe.js client-side (not currently used)
- `STRIPE_WEBHOOK_SECRET` - Only needed if you implement webhook handling for payment confirmations

## Quick Start

1. **For preset amounts only** (no setup needed):
   - Just start your dev server: `npm run dev`
   - Click the coffee icon and use preset amounts

2. **For custom amounts** (requires setup):
   - Get your Stripe Secret Key from Dashboard
   - Add `STRIPE_SECRET_KEY=sk_test_...` to `.env.local`
   - Restart your dev server
   - Custom amounts will now work

## Testing

### Test Mode (Recommended for Development)
- Use test keys: `pk_test_...` and `sk_test_...`
- Use test card: `4242 4242 4242 4242` (any future expiry, any CVC)
- See all test cards: https://stripe.com/docs/testing

### Live Mode (Production)
- Use live keys: `pk_live_...` and `sk_live_...`
- Real payments will be processed

## Troubleshooting

**Error: "Stripe configuration error"**
- Make sure `STRIPE_SECRET_KEY` is set in `.env.local`
- Restart your dev server after adding environment variables
- Check that the key starts with `sk_test_` or `sk_live_`

**Payment Links not working**
- Payment links are created via Stripe MCP and stored in the code
- They should work immediately without any setup
- Check browser console for errors

**Custom amount not working**
- Verify `STRIPE_SECRET_KEY` is in `.env.local` (not `.env`)
- Make sure the key is correct (copy entire key including `sk_test_` or `sk_live_` prefix)
- Restart dev server after adding the key


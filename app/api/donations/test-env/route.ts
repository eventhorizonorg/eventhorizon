import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to verify Stripe environment variables are loaded
 * Remove this after confirming everything works
 */
export async function GET() {
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY
  const hasPublishableKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET

  return NextResponse.json({
    status: 'success',
    env: {
      hasSecretKey,
      hasPublishableKey,
      hasWebhookSecret,
      secretKeyPrefix: hasSecretKey 
        ? process.env.STRIPE_SECRET_KEY?.substring(0, 7) + '...' 
        : 'not set',
      publishableKeyPrefix: hasPublishableKey
        ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7) + '...'
        : 'not set'
    },
    note: 'Secret key is required for custom amounts. Publishable key and webhook secret are optional.'
  })
}


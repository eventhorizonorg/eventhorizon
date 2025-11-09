import { NextResponse } from 'next/server'

// Payment links for preset donation amounts
// These were created via Stripe MCP and are stored here for easy access
const PRESET_PAYMENT_LINKS = {
  3: 'https://buy.stripe.com/6oUfZhbYA0ofaz9f9h6c000',   // $3
  5: 'https://buy.stripe.com/cNifZh3s46MD8r10en6c001',   // $5
  10: 'https://buy.stripe.com/6oUdR92o0db1cHh3qz6c002', // $10
  25: 'https://buy.stripe.com/cNi6oH2o02wn8r1bX56c003', // $25
  50: 'https://buy.stripe.com/7sY6oH0fS4Ev5eP1ir6c004', // $50
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'success',
      paymentLinks: PRESET_PAYMENT_LINKS
    })
  } catch (error) {
    console.error('Payment links API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch payment links',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount } = body

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Please enter a valid amount'
        },
        { status: 400 }
      )
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is not set')
      return NextResponse.json(
        {
          status: 'error',
          message: 'Stripe configuration error'
        },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey)

    // Get the base URL for redirect URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Donation to Event Horizon',
              description: 'Support Event Horizon with a donation'
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${origin}?donation=success`,
      cancel_url: `${origin}?donation=cancelled`,
      metadata: {
        donation_type: 'custom',
        amount: amount.toString()
      }
    })

    return NextResponse.json({
      status: 'success',
      url: session.url
    })
  } catch (error) {
    console.error('Create checkout API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create checkout session',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}


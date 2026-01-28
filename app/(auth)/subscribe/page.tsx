'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getStripe } from '@/lib/stripe'
import { Button } from '@/components/ui/button'
import { Check, Loader2, AlertCircle, Crown } from 'lucide-react'

interface PriceData {
  amount: number
  currency: string
  formatted: string
}

interface Prices {
  T2: Record<string, PriceData>
}

const PLANS = [
  {
    tier: 'T2',
    name: 'Founders',
    description: 'Elite access at the founders rate',
    icon: Crown,
    features: [
      'All Tier 1 Features',
      'Market Rotation System',
      'Direct Founder Access',
      '1-on-1 Mentoring',
      'Monthly Portfolio Reviews',
      'Priority Support',
    ],
  },
]

function SubscribePageContent() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [interval] = useState<'month'>('month')
  const [prices, setPrices] = useState<Prices | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(true)
  const searchParams = useSearchParams()
  const isRequired = searchParams.get('required') === 'true'
  const isNewUser = searchParams.get('newuser') === 'true'

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/stripe/prices')
        if (res.ok) {
          const data = await res.json()
          setPrices(data.prices)
        } else {
          // If prices API fails, set error but don't crash
          console.error('Failed to fetch prices:', res.status, res.statusText)
          setError('Unable to load pricing information. Please refresh the page.')
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error)
        setError('Unable to load pricing information. Please refresh the page.')
      } finally {
        setLoadingPrices(false)
      }
    }
    fetchPrices()
  }, [])

  const handleSubscribe = async (tier: string) => {
    setLoading(tier)
    setError(null)
    
    try {
      // Ensure we're in the browser before accessing window
      if (typeof window === 'undefined') {
        throw new Error('This action requires a browser environment')
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          interval,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/subscribe?canceled=true`,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        const errorMsg = data.error || 'Failed to create checkout session'
        console.error('Checkout error:', errorMsg)
        throw new Error(errorMsg)
      }
      
      if (data.url) {
        window.location.href = data.url
      } else if (data.sessionId) {
        const stripe = await getStripe()
        if (stripe) {
          try {
            const result = await (stripe as any).redirectToCheckout({ sessionId: data.sessionId })
            if (result?.error) {
              throw new Error(result.error.message || 'Failed to redirect to checkout')
            }
          } catch (stripeError) {
            console.error('Stripe.js redirect error:', stripeError)
            const checkoutUrl = `https://checkout.stripe.com/pay/${data.sessionId}`
            window.location.href = checkoutUrl
          }
        } else {
          const checkoutUrl = `https://checkout.stripe.com/pay/${data.sessionId}`
          window.location.href = checkoutUrl
        }
      } else {
        throw new Error('No checkout URL or session ID provided')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      setError(error instanceof Error ? error.message : 'Failed to start subscription. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const getPrice = (tier: string) => {
    if (!prices || !prices[tier as keyof Prices] || !prices[tier as keyof Prices][interval]) {
      return null
    }
    return prices[tier as keyof Prices][interval]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Logo */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">
        <div className="flex justify-center mb-6">
          <img
            src="https://i.imgur.com/h7es4Rn.png"
            alt="STEWART & CO"
            className="h-auto w-auto max-w-[200px]"
          />
        </div>
      </div>

      {/* Header Alerts */}
      {(isRequired || isNewUser || error) && (
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          {isRequired && (
            <div className="max-w-2xl mx-auto mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-semibold text-yellow-900 mb-1">Subscription Required</p>
                <p className="text-sm text-yellow-800">
                  You need an active subscription to access the platform. Please choose a plan below to continue.
                </p>
              </div>
            </div>
          )}
          {isNewUser && (
            <div className="max-w-2xl mx-auto mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                Welcome! Your account has been created. Choose a subscription plan to get started.
              </p>
            </div>
          )}
          {error && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-left flex-1">
                <p className="font-semibold text-red-900 mb-1">Error</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-xl leading-none"
                aria-label="Close error"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pricing Section */}
      <section className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12 not-prose">
        {/* Plans Grid */}
        <div className="relative mt-8 lg:mt-10 grid grid-cols-1 gap-6 lg:gap-10 items-stretch max-w-3xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const priceData = getPrice(plan.tier)
            
            return (
              <div
                key={plan.tier}
                className="h-full flex flex-col rounded-2xl border-2 border-yellow-400 shadow-sm bg-gradient-to-b from-yellow-50/50 to-white backdrop-blur-sm relative"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold bg-yellow-400 border-yellow-500 text-slate-900 shadow-sm">
                    Founders Tier
                  </span>
                </div>
                <div className="p-6 lg:p-8 grow">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-xl bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-yellow-600" strokeWidth={2} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    <p className="text-sm text-slate-600">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-8">
                    {loadingPrices ? (
                      <div className="h-12 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : priceData ? (
                      <div>
                        <div className="text-4xl font-bold text-yellow-600 mb-1">
                          {priceData.formatted}
                        </div>
                        <div className="text-sm text-slate-500">/ month</div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm">$300 / month</div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="text-slate-700 text-sm leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button */}
                <div className="p-6 lg:p-8 pt-0">
                  <Button
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={loading === plan.tier || !priceData}
                    className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                    variant="default"
                  >
                    {loading === plan.tier ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Get Started'
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Disclaimer */}
        <p className="mt-8 text-center text-sm text-neutral-600">
          Founders pricing applies to this subscription only. Plans auto-renew monthly and can be canceled anytime.
        </p>
      </section>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 text-center shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SubscribePageContent />
    </Suspense>
  )
}

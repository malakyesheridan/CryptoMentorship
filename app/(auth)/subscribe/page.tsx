'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStripe } from '@/lib/stripe'
import { Button } from '@/components/ui/button'
import { Check, Loader2, AlertCircle, Star, TrendingUp, Crown } from 'lucide-react'

interface PriceData {
  amount: number
  currency: string
  formatted: string
}

interface Prices {
  T1: Record<string, PriceData>
  T2: Record<string, PriceData>
  T3: Record<string, PriceData>
}

const PLANS = [
  {
    tier: 'T1',
    name: 'Foundation',
    description: 'Entry Level Systems',
    icon: Star,
    features: [
      'Long-Term Trend System',
      'Weekly Market Valuation',
      'Community Access',
      'Advanced Portfolio Construction',
    ],
  },
  {
    tier: 'T2',
    name: 'Growth',
    description: 'Advanced Management',
    icon: TrendingUp,
    features: [
      "All 'Foundation' Features",
      'Majors Rotation System',
      'Monthly Portfolio Review',
      'Priority Support',
      'Bear Market Strategies',
    ],
  },
  {
    tier: 'T3',
    name: 'Elite',
    description: 'VIP Access',
    icon: Crown,
    features: [
      "All 'Growth' Features",
      'Market Rotation System',
      '1-on-1 Mentoring',
      'Custom Investment Strategy',
      'Direct Founder Access',
    ],
  },
]

const INTERVALS = [
  { key: 'month' as const, label: 'Monthly', savings: null },
  { key: '3month' as const, label: '3 Months', savings: 7 },
  { key: '6month' as const, label: '6 Months', savings: 11 },
  { key: 'year' as const, label: '1 Year', savings: 22 },
]

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [interval, setInterval] = useState<'month' | '3month' | '6month' | 'year'>('month')
  const [prices, setPrices] = useState<Prices | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(true)
  const router = useRouter()
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
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error)
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
        {/* Billing Toggle */}
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl border border-slate-200 bg-[#FFFDF7] p-1.5 shadow-lg gap-1.5">
              {INTERVALS.map((intervalOption) => (
                <button
                  key={intervalOption.key}
                  onClick={() => setInterval(intervalOption.key)}
                  className={`relative px-6 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                    interval === intervalOption.key
                      ? 'bg-gold-400 text-slate-900 shadow-md'
                      : 'text-slate-700 hover:bg-white/50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{intervalOption.label}</span>
                    {intervalOption.savings && (
                      <span className={`text-xs mt-0.5 ${
                        interval === intervalOption.key ? 'text-slate-700' : 'text-slate-500'
                      }`}>
                        Save up to {intervalOption.savings}%
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="relative mt-8 lg:mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-stretch">
          {/* Most Popular Badge */}
          <div className="hidden md:block absolute -top-6 left-1/2 -translate-x-1/2 z-10">
            <span className="rounded-full border px-3 py-1 text-xs font-semibold bg-amber-50 border-amber-300 text-amber-700 shadow-sm">
              Most Popular
            </span>
          </div>

          {PLANS.map((plan) => {
            const Icon = plan.icon
            const priceData = getPrice(plan.tier)
            const isPopular = plan.tier === 'T2'
            
            return (
              <div
                key={plan.tier}
                className={`h-full flex flex-col rounded-2xl border shadow-sm bg-[#FFFDF7] backdrop-blur-sm ${
                  isPopular ? 'border-2 border-gold-400' : 'border-slate-200'
                }`}
              >
                <div className="p-6 lg:p-8 grow">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gold-400/10 border-2 border-gold-400 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-gold-400" strokeWidth={2} />
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
                        <div className="text-4xl font-bold text-gold-400 mb-1">
                          {priceData.formatted}
                        </div>
                        <div className="text-sm text-slate-500">
                          / {interval === 'month' ? 'month' : interval === '3month' ? '3 months' : interval === '6month' ? '6 months' : 'year'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm">Price unavailable</div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-gold-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
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
                    className={`w-full rounded-xl ${
                      isPopular
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-white border-2 border-gold-400 text-slate-900 hover:bg-gold-50'
                    }`}
                    variant={isPopular ? 'default' : 'outline'}
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
          All tiers include our full community access. Upgrade or downgrade anytime. Prices in AUD. Plans auto-renew, cancel anytime.
        </p>
      </section>
    </div>
  )
}

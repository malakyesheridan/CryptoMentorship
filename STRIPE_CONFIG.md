# Stripe Configuration

Add these to your `.env` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY="sk_live_..."  # Add your Stripe secret key from Stripe Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."  # Add your Stripe publishable key from Stripe Dashboard
STRIPE_WEBHOOK_SECRET="whsec_..."  # Add your webhook secret from Stripe Dashboard

# Foundation (T1) - Monthly: $700 AUD
STRIPE_PRICE_T1_MONTHLY="price_1SQKl7DJPZctYjdr9SXiTpId"
STRIPE_PRICE_T1_3MONTH="price_1SQKl7DJPZctYjdrdvsM2D4D"  # $2,100 AUD
STRIPE_PRICE_T1_6MONTH="price_1SQKl7DJPZctYjdrpF6Ka7vF"  # $4,000 AUD
STRIPE_PRICE_T1_ANNUAL="price_1SQKl7DJPZctYjdriKcVBNes"  # $7,500 AUD

# Growth (T2) - Monthly: $1,200 AUD
STRIPE_PRICE_T2_MONTHLY="price_1SQKnPDJPZctYjdrg5CalkGK"
STRIPE_PRICE_T2_3MONTH="price_1SQKnPDJPZctYjdr8UbklfLe"  # $6,500 AUD
STRIPE_PRICE_T2_6MONTH="price_1SQKnPDJPZctYjdrmoDVF6mW"  # $3,500 AUD
STRIPE_PRICE_T2_ANNUAL="price_1SQKnPDJPZctYjdrTCNZOJUY"  # $12,500 AUD

# Elite (T3) - NOTE: Price IDs are swapped in Stripe, handled in code
# Monthly: $2,000 AUD (uses ANNUAL price ID)
STRIPE_PRICE_T3_MONTHLY="price_1SQKo9DJPZctYjdrs3zzJTZo"  # Actually $5,750 for 3 months
STRIPE_PRICE_T3_3MONTH="price_1SQKoODJPZctYjdrzirYAqxb"  # Actually $10,500 for 6 months
STRIPE_PRICE_T3_6MONTH="price_1SQKofDJPZctYjdrmLqVAaAe"  # Actually $20,000 for 12 months (annual)
STRIPE_PRICE_T3_ANNUAL="price_1SQKniDJPZctYjdriOaONtg3"  # Actually $2,000 monthly
# The code automatically maps these correctly - monthly uses ANNUAL ID, etc.
```

## Next Steps

1. **Add webhook secret**: Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
   - Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
   - Copy the signing secret and add to `STRIPE_WEBHOOK_SECRET`

2. **Test locally**: Use Stripe CLI for local webhook testing:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```


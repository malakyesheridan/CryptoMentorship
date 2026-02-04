import assert from 'node:assert/strict'
import { computeRiskProfile, RiskOnboardingAnswers } from '../src/lib/riskOnboarding/score'

const baseAnswers: RiskOnboardingAnswers = {
  goal: 'wealth_growth',
  time_horizon: 'y3_plus',
  drawdown_reaction: 'buy_more',
  risk_statements: {
    understand_volatility: 'agree',
    accept_loss: 'strongly_agree',
    hold_through_downturns: 'agree',
    prefer_stability: 'disagree',
  },
  activity_level: 'passive_buy_hold',
  own_crypto: 'yes',
  confidence_level: 'advanced',
  need_within_12m: 'no',
}

const aggressive = computeRiskProfile(baseAnswers)
assert.equal(aggressive.recommendedProfile, 'AGGRESSIVE')
assert.ok(aggressive.score >= 70)

const sellMost = computeRiskProfile({
  ...baseAnswers,
  drawdown_reaction: 'sell_most',
})
assert.equal(sellMost.recommendedProfile, 'CONSERVATIVE')

const needFunds = computeRiskProfile({
  ...baseAnswers,
  need_within_12m: 'yes',
})
assert.equal(needFunds.recommendedProfile, 'CONSERVATIVE')

const capSemi = computeRiskProfile({
  ...baseAnswers,
  risk_statements: {
    ...baseAnswers.risk_statements,
    hold_through_downturns: 'disagree',
  },
})
assert.equal(capSemi.recommendedProfile, 'SEMI')

console.log('risk-profile-score tests passed')


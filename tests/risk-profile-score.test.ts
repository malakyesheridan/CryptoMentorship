import assert from 'node:assert/strict'
import { computeRiskProfile, RiskOnboardingAnswers } from '../src/lib/riskOnboarding/score'
import { DEFAULT_RISK_ONBOARDING_CONFIG, getScoreRangeForProfile } from '../src/lib/riskOnboarding/config'

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
assert.ok(aggressive.score >= 80)
const aggressiveRange = getScoreRangeForProfile(aggressive.recommendedProfile, DEFAULT_RISK_ONBOARDING_CONFIG)
assert.ok(aggressiveRange)
assert.ok(aggressive.score >= aggressiveRange!.min && aggressive.score <= aggressiveRange!.max)

const sellMost = computeRiskProfile({
  ...baseAnswers,
  drawdown_reaction: 'sell_most',
})
assert.equal(sellMost.recommendedProfile, 'CONSERVATIVE')
const sellMostRange = getScoreRangeForProfile(sellMost.recommendedProfile, DEFAULT_RISK_ONBOARDING_CONFIG)
assert.ok(sellMostRange)
assert.ok(sellMost.score >= sellMostRange!.min && sellMost.score <= sellMostRange!.max)

const needFunds = computeRiskProfile({
  ...baseAnswers,
  need_within_12m: 'yes',
})
assert.equal(needFunds.recommendedProfile, 'CONSERVATIVE')
const needFundsRange = getScoreRangeForProfile(needFunds.recommendedProfile, DEFAULT_RISK_ONBOARDING_CONFIG)
assert.ok(needFundsRange)
assert.ok(needFunds.score >= needFundsRange!.min && needFunds.score <= needFundsRange!.max)

const capSemi = computeRiskProfile({
  ...baseAnswers,
  risk_statements: {
    ...baseAnswers.risk_statements,
    hold_through_downturns: 'disagree',
  },
})
assert.equal(capSemi.recommendedProfile, 'SEMI')
const capSemiRange = getScoreRangeForProfile(capSemi.recommendedProfile, DEFAULT_RISK_ONBOARDING_CONFIG)
assert.ok(capSemiRange)
assert.ok(capSemi.score >= capSemiRange!.min && capSemi.score <= capSemiRange!.max)

console.log('risk-profile-score tests passed')


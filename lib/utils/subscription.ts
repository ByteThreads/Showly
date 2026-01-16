import type { Agent } from '@/types/database';

/**
 * Check if agent has an active subscription (trial or paid)
 */
export function hasActiveSubscription(agent: Agent | null): boolean {
  if (!agent) return false;

  const activeStatuses = ['active', 'trial'];
  return activeStatuses.includes(agent.subscriptionStatus);
}

/**
 * Check if agent is currently in trial period (14 days, unlimited showings)
 */
export function isInTrial(agent: Agent | null): boolean {
  if (!agent || agent.subscriptionStatus !== 'trial') return false;

  // Check if trial has expired (14 days)
  if (agent.trialStartDate) {
    const trialStart = agent.trialStartDate instanceof Date ? agent.trialStartDate : new Date(agent.trialStartDate);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    if (trialStart < fourteenDaysAgo) {
      return false; // Trial expired by time
    }
  }

  return true;
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(agent: Agent | null): boolean {
  if (!agent || agent.subscriptionStatus !== 'trial') return false;
  return !isInTrial(agent);
}

/**
 * Get remaining trial days (0-14)
 */
export function getRemainingTrialDays(agent: Agent | null): number {
  if (!agent || !agent.trialStartDate) return 0;

  const trialStart = agent.trialStartDate instanceof Date ? agent.trialStartDate : new Date(agent.trialStartDate);
  const now = new Date();
  const diffTime = now.getTime() - trialStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, 14 - diffDays);
}

/**
 * Get the reason why trial expired
 * Returns 'time_limit' or null if not expired
 */
export function getTrialExpirationReason(agent: Agent | null): 'time_limit' | null {
  if (!agent || agent.subscriptionStatus !== 'trial') return null;

  // Check time limit
  if (agent.trialStartDate) {
    const trialStart = agent.trialStartDate instanceof Date ? agent.trialStartDate : new Date(agent.trialStartDate);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    if (trialStart < fourteenDaysAgo) {
      return 'time_limit';
    }
  }

  return null;
}

/**
 * Check if agent needs to upgrade (trial expired or no subscription)
 */
export function needsUpgrade(agent: Agent | null): boolean {
  if (!agent) return true;

  const hasActivePaidSub = agent.subscriptionStatus === 'active';
  const hasValidTrial = isInTrial(agent);

  return !hasActivePaidSub && !hasValidTrial;
}

/**
 * Check if agent is a founder customer (first 200)
 */
export function isFounderCustomer(agent: Agent | null): boolean {
  return agent?.isFounderCustomer === true;
}

/**
 * Get subscription display name
 */
export function getSubscriptionDisplayName(agent: Agent | null): string {
  if (!agent) return 'No Subscription';

  switch (agent.subscriptionStatus) {
    case 'active':
      return agent.isFounderCustomer ? 'Founder Plan' : 'Pro Plan';
    case 'trial':
      return 'Free Trial';
    case 'past_due':
      return 'Payment Past Due';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Inactive';
  }
}

/**
 * Get status badge color
 */
export function getSubscriptionBadgeColor(agent: Agent | null): string {
  if (!agent) return 'bg-gray-100 text-gray-800';

  switch (agent.subscriptionStatus) {
    case 'active':
      return agent.isFounderCustomer
        ? 'bg-purple-100 text-purple-800' // Founder = purple
        : 'bg-green-100 text-green-800';   // Active = green
    case 'trial':
      return 'bg-blue-100 text-blue-800';
    case 'past_due':
      return 'bg-amber-100 text-amber-800';
    case 'cancelled':
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

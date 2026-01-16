# SMS Setup Guide - Twilio A2P 10DLC Registration

## ⚠️ IMPORTANT: A2P 10DLC Registration Required

**Status**: SMS works in testing but has limitations without A2P 10DLC registration.

### What is A2P 10DLC?

A2P 10DLC = **Application-to-Person messaging using 10-Digit Long Codes**

- Required by US carriers (AT&T, T-Mobile, Verizon) as of 2023
- Prevents spam and ensures legitimate business messaging
- Without registration: Limited throughput, potential message blocking, higher costs
- With registration: Full throughput, better deliverability, lower costs

---

## Current Status

✅ **Working**: SMS integration is fully coded and functional
⚠️ **Limitation**: Without A2P 10DLC registration, messages have restrictions:
- Lower daily message limits
- May not reach all carriers reliably
- Higher per-message costs
- Some carriers may block unregistered traffic

---

## How to Register for A2P 10DLC

### Prerequisites
1. Twilio account (you have this ✅)
2. Business information (EIN, business address, website)
3. Use case description
4. Sample messages

### Step-by-Step Process

#### 1. Register Your Business
Go to: https://console.twilio.com/us1/develop/sms/settings/a2p

**Required Information:**
- Legal business name
- Business type (LLC, Corporation, Sole Proprietorship, etc.)
- EIN (Employer Identification Number) or Tax ID
- Business address
- Business website
- Industry vertical (Real Estate)
- Business description

**Cost**: $4/month per registered brand

#### 2. Create a Campaign
After brand registration, create a messaging campaign:

**Campaign Details for Showly:**
- **Use Case**: Real Estate
- **Campaign Description**:
  ```
  Automated showing confirmations, reminders, and status updates for
  real estate property viewings. Clients opt-in when booking showings
  to receive SMS notifications about their scheduled appointments.
  ```
- **Sample Messages**:
  1. Booking: "Your showing at 123 Main St is confirmed for Jan 15 at 2 PM. See you there! -John Doe"
  2. Reminder: "Reminder: Your showing at 123 Main St starts in 1 hour (2 PM). See you soon! -John"
  3. Update: "Your showing at 123 Main St on Jan 15 at 2 PM has been confirmed. -John Doe"

**Cost**: $15-$100 one-time registration fee (varies by volume)

#### 3. Register Your Phone Number
Link your Twilio phone number to the approved campaign:
- Go to Phone Numbers → Active Numbers
- Select your number
- Under "Messaging Configuration", assign to your A2P campaign

**Cost**: Included (no additional charge)

#### 4. Wait for Approval
- **Timeline**: 2-5 business days typically
- **Status**: Check Twilio Console → Messaging → Regulatory Compliance
- You'll receive email updates on approval status

---

## Registration Costs Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Brand Registration | $4 | Monthly |
| Campaign Registration | $15-100 | One-time |
| Phone Number | $1 | Monthly |
| Per-Message Cost | $0.0079 | Per SMS |

**Total Setup**: ~$20-105 one-time + $5/month ongoing

---

## Current Limitations (Before Registration)

Without A2P 10DLC registration:

❌ **Throughput Limits**:
- Unregistered: 3-6 messages per minute
- Registered: Up to 4,500 messages per minute

❌ **Deliverability**:
- Some carriers may filter or block messages
- Higher spam score
- Inconsistent delivery rates

❌ **Costs**:
- Higher per-message fees for unregistered traffic
- Carrier pass-through fees may apply

---

## Recommended Timeline

### Phase 1: Testing (Now)
- ✅ Use current setup for development/testing
- ✅ Test with your own verified phone numbers
- ✅ Verify all SMS templates work correctly

### Phase 2: Pre-Launch (Before public beta)
- 🔲 Complete A2P 10DLC brand registration
- 🔲 Submit campaign for approval
- 🔲 Link phone number to campaign
- 🔲 Wait for approval (2-5 days)

### Phase 3: Launch (After approval)
- ✅ SMS ready for production use
- ✅ Full deliverability across all carriers
- ✅ Optimized message costs

---

## Resources

- **Twilio A2P Guide**: https://www.twilio.com/docs/sms/a2p-10dlc
- **Registration Portal**: https://console.twilio.com/us1/develop/sms/settings/a2p
- **Campaign Use Cases**: https://www.twilio.com/docs/sms/a2p-10dlc/use-case-examples
- **Support**: https://support.twilio.com

---

## Alternative: Short Codes (Not Recommended for Showly)

**What**: 5-6 digit numbers (e.g., 12345)
**Pros**: Higher throughput, instant delivery, no A2P registration needed
**Cons**:
- **$1,000+/month cost** (way too expensive for Showly)
- 8-12 week approval process
- Overkill for showing notifications

**Verdict**: Stick with 10DLC registration (much cheaper at $5/month)

---

## Testing Checklist (Current)

While waiting for A2P approval, you can still test:

- ✅ Send SMS to verified numbers (add in Twilio Console)
- ✅ Test all 5 message templates (booking, reminder, confirmed, cancelled, rescheduled)
- ✅ Verify phone number formatting
- ✅ Check message delivery logs in Twilio Console
- ✅ Ensure error handling works
- ⚠️ Expect some delivery delays or failures to unverified numbers

---

## Notes

- **Created**: January 16, 2026
- **Status**: A2P 10DLC registration pending
- **Next Action**: Complete brand registration when ready to launch
- **Priority**: Medium (not blocking development, but required for production)

---

## Quick Start When Ready

```bash
# 1. Go to Twilio Console
https://console.twilio.com/us1/develop/sms/settings/a2p

# 2. Click "Register a brand"
# 3. Fill in ByteThreads LLC business information
# 4. Create campaign (Real Estate use case)
# 5. Wait 2-5 days for approval
# 6. Link phone number to approved campaign
# 7. Test with unverified numbers - should work!
```

---

**Remember**: SMS works now for testing, but complete A2P 10DLC registration before launching to paying customers! 📱

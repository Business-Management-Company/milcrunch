# MilCrunch Cost Tracking Integration

*Integrated:* March 13, 2026  
*Status:* Ready to deploy

## What Was Added

Cost tracking has been integrated into MilCrunch to automatically log all Anthropic API costs to the OpenClaw cost tracking dashboard.

### Files Added/Modified

1. *api/_lib/cost-tracker.js* - Cost tracking module
   - Calculates costs based on token usage
   - Sends cost data to OpenClaw endpoint
   - Works in Vercel serverless environment

2. *api/anthropic.js* - MODIFIED
   - Now extracts token usage from Anthropic responses
   - Logs costs automatically after each successful API call
   - Detects operation type from system prompts (Creator Chat, Caption Generation, etc.)

3. *.env.example* - Environment variables template

### How It Works

1. User interacts with AI features in MilCrunch (Creator Chat, Caption Generator, etc.)
2. Frontend sends request to `/api/anthropic`
3. Vercel function proxies to Anthropic API
4. On successful response, extracts token usage
5. Sends cost log to OpenClaw endpoint
6. Cost appears in dashboard: http://dashboard.seeksy.io:8080/cost-tracker-enhanced.html

### Cost Breakdown

All costs are logged as:
- *Customer:* BMC
- *Project:* MilCrunch
- *Service:* Anthropic
- *Operation:* Varies (Creator AI Chat, Caption Generation, Brand Matching, etc.)

## Deployment Instructions

### Option 1: Commit and Push (Scout Can Do This)

```bash
cd /data/.openclaw/workspace/repos/milcrunch
git commit -m "Add cost tracking integration"
git push origin main
```

Vercel will auto-deploy once pushed.

### Option 2: Give to Claude/Cursor for Deployment

If you're working with Claude or Cursor on this repo, just tell them:

> "There are cost tracking changes ready in the repo. Commit them with message 'Add cost tracking integration' and push to main."

### Environment Variables (Vercel)

Add these to your Vercel project settings:

```
COST_TRACKER_ENDPOINT=http://openclaw.podlogix.co:8765/api/log-cost
COST_TRACKER_TOKEN=milcrunch-cost-tracker-2026
```

*How to add in Vercel:*
1. Go to project settings
2. Environment Variables tab
3. Add each variable for Production, Preview, and Development

## Testing

Once deployed, use any AI feature in MilCrunch (Creator Chat, Caption Generator, etc.)

Within a few minutes, costs should appear in the dashboard under:
- Customer: BMC
- Project: MilCrunch

## What Gets Tracked

Every Anthropic API call will log:
- Timestamp
- Model used (claude-sonnet-4-5, etc.)
- Input tokens
- Output tokens
- Calculated cost
- Operation type (what feature was used)

## Cost Estimates

Based on current pricing (Claude Sonnet 4.5):
- Short chat message: ~$0.01 - $0.05
- Long content generation: ~$0.10 - $0.30
- Caption generation: ~$0.02 - $0.08

All costs are tracked in real-time and visible in the dashboard.

## Troubleshooting

*Costs not appearing in dashboard?*
1. Check Vercel function logs for "[cost-tracker]" messages
2. Verify environment variables are set
3. Check that OpenClaw HTTP endpoint is running (port 8765)

*Local development:*
Costs won't be logged when running locally (localhost endpoint is skipped).
This is intentional to avoid polluting production data during development.

## Next Steps

After this is deployed and working:
1. Monitor dashboard for a few days
2. Verify costs match Anthropic billing
3. Use insights to optimize API usage
4. Repeat integration for other projects (PCSing.ai, etc.)

---

*Questions?* Ask Scout in Slack.

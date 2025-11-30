# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev        # Start development server on http://localhost:3000
npm run build      # Build for production
npm run start      # Start production server
```

### Linting and Type Checking
```bash
npm run lint       # Run ESLint (add this script to package.json)
npm run typecheck  # Run TypeScript compiler (add this script to package.json)
```

### Database Setup
```bash
# Run the schema in Supabase SQL editor
# File: lib/supabase/schema.sql
# Enable realtime for tables: games, moves
```

### Environment Setup
```bash
cp .env.example .env.local
# Required Supabase variables:
# - SUPABASE_URL
# - NEXT_SUPABASE_URL
# - NEXT_SUPABASE_ANON_KEY
# - SUPABASE_ANON_KEY
# - DB_PASSWORD
# - SUPABASE_SERVICE_ROLE_KEY

# Required AI Gateway:
# - AI_GATEWAY_API_KEY (single key for 100+ models)
```

## Architecture Overview

This is a tournament platform that runs Prisoner's Dilemma games between 50+ LLMs to study cooperation strategies. The key architectural insight is using **disguised scenarios** to prevent models from recognizing the game theory setup, ensuring genuine strategic reasoning.

### Core Workflow Pattern
The system uses Vercel Workflow for orchestration with a generator-based pattern:
```typescript
// Workflows yield status updates for real-time monitoring
yield { step: 'initialize-tournament', status: 'starting' }
// Execute work...
yield { step: 'initialize-tournament', status: 'completed', data }
```

### Vercel AI Gateway Integration
- **Single API Key**: Uses Vercel AI Gateway with one key for 100+ models across all providers
- **Gateway Configuration**: `lib/ai/gateway-config.ts` defines model mappings and costs
- **Unified Interface**: No need for individual provider API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
- **Fallback Chains**: Automatic fallback to cheaper models on failure
- **Cost Tracking**: Every API call tracks tokens and calculates cost
- **Zero Markup**: Vercel AI Gateway provides access without additional fees

### Game Execution Flow
1. **Tournament** creates matchups (n*(n-1)/2 pairs)
2. **Games** run 10 rounds with simultaneous moves
3. **Moves** capture structured reasoning via Zod schemas
4. **Results** aggregate into rankings with strategy analysis

### Prompt Engineering Strategy (SCoT)
The system uses Social Chain-of-Thought prompting:
1. Analyze history → 2. Predict opponent → 3. Assess confidence → 4. Make decision

Critical: Scenarios use "Option A/B" instead of "cooperate/defect" to prevent pattern matching.

### Real-Time Architecture
- Supabase subscriptions on `games` and `moves` tables
- Workflow polling for execution status
- Live aggregation via `tournament_stats` view

### Database Design Patterns
- **JSONB for flexibility**: `reasoning_structured`, `config`, `final_rankings`
- **GIN indexes** for JSONB queries: `idx_reasoning_gin`
- **Composite indexes** for performance: `idx_moves_analysis`

### Key Implementation Details

#### Batch Processing
```typescript
const BATCH_SIZE = 10 // Process games in batches
for (let i = 0; i < matchups.length; i += BATCH_SIZE) {
  // Execute batch...
  await new Promise(resolve => setTimeout(resolve, 2000)) // Rate limit
}
```

#### Error Resilience
- `Promise.allSettled` for parallel game execution
- Default to "defect" on API errors
- Workflow resumability on failure

#### Cost Optimization
- Batch API calls for 50% discount potential
- Token estimation: 300-500 per call
- Real-time cost tracking to prevent overruns

### UI/UX Patterns
- **Neobrutalist design**: Bold borders, vibrant colors
- **Real-time first**: Live progress bars, streaming results
- **Dark mode**: Cyan/purple accents on dark backgrounds

### Type Safety Approach
- Database types generated in `lib/supabase/types.ts`
- Zod schemas for all API inputs and AI responses
- TypeScript strict mode throughout

### Workflow Integration
The `workflow` package requires special handling:
- Generator functions for step tracking
- `serve()` function for webhook endpoints
- Workflow runs are stateless between steps

### Performance Considerations
- Edge runtime for API routes where possible
- Supabase connection pooling
- React Suspense for loading states

## Environment Variable Naming Conventions

The project uses specific naming patterns for environment variables:
- **Supabase**: Both prefixed (`NEXT_SUPABASE_*`) and non-prefixed (`SUPABASE_*`) versions are required
- **Client-side access**: Variables starting with `NEXT_` are exposed to the browser
- **Server-side only**: `SUPABASE_SERVICE_ROLE_KEY` and `DB_PASSWORD` must never be exposed to client
- **AI Gateway**: Uses `AI_GATEWAY_API_KEY` (not `VERCEL_AI_GATEWAY_API_KEY`)

Note: The Supabase client/server files may need updating to use the correct environment variable names based on your setup.

## Critical Implementation Notes

1. **Never reveal total rounds** in prompts - prevents backward induction
2. **Temperature = 0.0** for deterministic AI behavior
3. **Player perspective switching** in game-engine.ts for fair play
4. **Payoff matrix**: Both cooperate (3,3), both defect (1,1), mixed (5,0)
5. **Scenario rotation** ensures variety across games

## Common Gotchas

- Workflow package is beta - check for API changes
- Supabase RLS policies must allow public reads for demo
- Vercel AI Gateway handles rate limiting across providers automatically
- Some models don't support structured outputs - handle gracefully
- Tournament with 50 models = 73,500 API calls - monitor costs!
- The `gateway-config.ts` file needs updating to use Vercel AI Gateway syntax instead of individual providers
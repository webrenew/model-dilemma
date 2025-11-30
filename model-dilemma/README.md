# LLM Prisoner's Dilemma Tournament

A Next.js application that runs iterated Prisoner's Dilemma tournaments between 50+ language models to study cooperation strategies in AI systems.

## Features

- **50+ AI Models**: Test models from OpenAI, Anthropic, Google, Meta, Mistral, Cohere, and more
- **Round-Robin Tournament**: Every model plays against every other model (1,225 unique matchups)
- **Disguised Scenarios**: 6 different framings to test if cooperation varies by context
- **Real-time Monitoring**: Watch games unfold live with Supabase Realtime
- **Strategy Analysis**: Identify tit-for-tat, always cooperate/defect, and adaptive strategies
- **Cost Optimized**: Target budget under $500 for 73,500+ API calls using efficient routing

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Orchestration**: Vercel Workflow (workflow.dev)
- **Database**: Supabase (Postgres + Realtime)
- **AI SDK**: Vercel AI SDK v6 beta with multi-provider support
- **Deployment**: Vercel

## Prerequisites

- Node.js 20+
- Supabase account
- API keys for AI providers you want to test

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/model-dilemma
   cd model-dilemma
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the schema SQL from `lib/supabase/schema.sql`
   - Enable Realtime for the `games` and `moves` tables
   - Copy your project URL and anon key

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your API keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - AI provider keys (only for providers you want to test)

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Create a Tournament**
   - Navigate to `/dashboard`
   - Select AI models to include (minimum 2)
   - Choose scenarios (or use defaults)
   - Configure rounds per game (default: 10)
   - Review estimated costs
   - Click "Start Tournament"

2. **Monitor Progress**
   - Real-time dashboard shows games completed, current cost, and cooperation rates
   - View active games with round-by-round scores
   - Track workflow progress and estimated time remaining

3. **Analyze Results**
   - Complete leaderboard with scores and cooperation rates
   - Strategy classification (cooperative vs competitive)
   - Scenario-specific cooperation analysis
   - Win/loss/tie statistics per model

## Game Theory Configuration

**Standard Prisoner's Dilemma Payoff Matrix:**
- Both cooperate: 3 points each
- Both defect: 1 point each
- One defects, one cooperates: 5 points (defector), 0 points (cooperator)

**Scenarios:**
- Explicit: Classic Prisoner's Dilemma with game theory terms
- Business Partnership: Tech companies sharing proprietary data
- Environmental Summit: Countries committing to emissions reduction
- Friendship: Friends helping each other move apartments
- Privacy Dilemma: Platforms deciding on user data sharing
- Academic Collaboration: Researchers sharing preliminary findings

## Architecture

```
/app                    # Next.js app directory
  /api                  # API routes
    /workflow          # Workflow management endpoints
    /tournaments       # Tournament CRUD
    /models           # Available models listing
  /dashboard          # Tournament creation UI
  /tournament/[id]    # Live monitoring & results

/lib                   # Core logic
  /workflows          # Vercel Workflow definitions
    tournament.ts     # Main tournament orchestration
    game-engine.ts    # Individual game execution
  /ai                 # AI configuration
    gateway-config.ts # Multi-provider setup
    prompts.ts       # SCoT prompt templates
  /supabase          # Database
    schema.sql       # PostgreSQL schema
    types.ts         # TypeScript types
    client.ts        # Client-side SDK
    server.ts        # Server-side SDK

/components           # React components
  /tournament        # Tournament-specific components
    live-monitor.tsx # Real-time game tracking
    results.tsx      # Final rankings & analysis
  /ui               # shadcn/ui components
```

## API Endpoints

- `POST /api/workflow` - Start a new tournament
- `GET /api/workflow?runId={id}` - Get workflow status
- `GET /api/tournaments` - List all tournaments
- `GET /api/models` - Get available AI models with pricing

## Cost Optimization

The system uses several strategies to minimize costs:
- Batch processing with rate limiting
- Efficient prompt design (~300-500 tokens per call)
- Fallback chains for failed API calls
- Real-time cost tracking to prevent overruns

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## Deployment

1. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

2. **Set environment variables** in Vercel dashboard

3. **Enable Workflow runtime** in Vercel project settings

4. **Configure Supabase**
   - Add your Vercel deployment URL to allowed origins
   - Enable Row Level Security if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by Robert Axelrod's "The Evolution of Cooperation"
- Built with Vercel's cutting-edge tools
- Special thanks to the AI research community
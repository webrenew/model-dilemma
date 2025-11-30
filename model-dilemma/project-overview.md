# LLM Prisoner's Dilemma Tournament: Workflow.dev Implementation Prompt

## CLAUDE Agent Kickoff Prompt

```
Build a complete LLM Prisoner's Dilemma tournament platform using Next.js 15, Vercel Workflow, and Supabase.

CORE REQUIREMENTS:
- Test 50+ LLM models across round-robin matchups (1,225 unique pairs)
- Execute 10-round iterated Prisoner's Dilemma games with disguised scenarios
- Capture chain-of-thought reasoning via structured outputs
- Real-time tournament monitoring with Supabase Realtime
- Target budget: <$500 for 73,500+ API calls
- Use Vercel AI Gateway for multi-provider routing with zero markup

TECH STACK:
- Next.js 15 App Router with Server Actions
- Vercel Workflow (workflow.dev) for orchestration
- Vercel AI SDK v4+ with AI Gateway
- Supabase (Postgres + Realtime)
- TypeScript strict mode
- Tailwind CSS + shadcn/ui components
- Zod for schema validation

PROJECT STRUCTURE:
/app
  /tournament
    /[id]
      /page.tsx          # Live tournament monitoring dashboard
      /actions.ts        # Server actions for controls
  /api
    /workflow
      /route.ts          # Workflow webhook endpoint
  /dashboard
    /page.tsx            # Tournament creation & results
/lib
  /workflows
    /tournament.ts       # Main tournament workflow
    /game-engine.ts      # Individual game execution
    /scenarios.ts        # Prompt templates (5 types)
  /supabase
    /client.ts
    /schema.sql
  /ai
    /gateway-config.ts   # Model definitions & routing
    /prompts.ts          # SCoT templates
/components
  /tournament
    /live-monitor.tsx    # Real-time game progress
    /cooperation-chart.tsx
    /reasoning-viewer.tsx
  /ui                    # shadcn components

DATABASE SCHEMA (Supabase):

-- Core tables
tournaments (id, name, config JSONB, status, created_at)
participants (id, tournament_id, model_id, provider, model_config JSONB)
games (id, tournament_id, participant_1_id, participant_2_id, scenario_type, game_number, final_scores JSONB, cooperation_rates JSONB, completed_at)
moves (id, game_id, participant_id, round_number, action, opponent_action, points_earned, created_at)
reasoning_logs (id, move_id, raw_response TEXT, reasoning_structured JSONB, tokens_used JSONB, latency_ms, cost_usd)

-- Indexes
CREATE INDEX idx_reasoning_gin ON reasoning_logs USING GIN (reasoning_structured jsonb_path_ops);
CREATE INDEX idx_moves_analysis ON moves(game_id, participant_id, round_number);
CREATE INDEX idx_games_scenario ON games(tournament_id, scenario_type);

-- Real-time setup
ALTER PUBLICATION supabase_realtime ADD TABLE games, moves;

WORKFLOW IMPLEMENTATION (lib/workflows/tournament.ts):

Use Vercel Workflow's step-by-step execution pattern:
1. Initialize tournament (create DB records for 1,225 matchups)
2. For each matchup pair:
   - Execute 3 games with different scenarios (parallel)
   - Each game: 10 sequential rounds with simultaneous moves
   - Store reasoning + outcomes to Supabase
3. Calculate final rankings and cooperation metrics
4. Generate behavioral analysis report

GAME ENGINE (lib/workflows/game-engine.ts):

Structured output schema:
{
  action: "cooperate" | "defect",
  opponent_prediction: "cooperate" | "defect",
  confidence: number (0-1),
  reasoning_steps: string[],
  decision_factors: {
    trust_level: number,
    risk_assessment: number,
    history_weight: number
  }
}

Payoff matrix (Axelrod standard):
- Both cooperate: 3 points each
- Both defect: 1 point each  
- One defects, one cooperates: 5 points (defector), 0 points (cooperator)

SCENARIO TYPES (5 disguised + 1 explicit):
1. Explicit: Classic Prisoner's Dilemma with game theory terms
2. Business Partnership: Tech companies sharing proprietary data
3. Environmental Summit: Countries committing to emissions reduction
4. Friendship: Friends helping each other move apartments
5. Privacy Dilemma: Platforms deciding on user data sharing
6. Academic Collaboration: Researchers sharing preliminary findings

PROMPT ENGINEERING:
- Use neutral labels ("Option A" / "Option B" instead of cooperate/defect)
- Include Social Chain-of-Thought (SCoT): "First predict opponent's action, then choose"
- Never reveal total rounds (prevents backward induction)
- Temperature = 0.0 for deterministic behavior
- Max tokens = 500 for reasoning capture

AI GATEWAY CONFIG:
Support models from: OpenAI, Anthropic, Google, xAI, Mistral, DeepSeek, Meta Llama, Cohere, Together.ai
Include automatic failover chains
Track costs via gateway.cost field

REAL-TIME FEATURES:
- Live progress bar showing games completed
- Streaming cooperation rates by model
- Current round-by-round moves for active games
- Cost accumulation tracker
- Estimated completion time

DASHBOARD FEATURES:
- Tournament creation form (select models, scenarios, rounds)
- Results table with sortable columns:
  * Model name
  * Total score
  * Cooperation rate
  * Wins/losses/ties
  * Avg reasoning tokens
  * Total cost
- Cooperation heatmap (model vs model)
- Strategy classification (Tit-for-Tat, Always Defect, etc.)
- Reasoning pattern analysis (JSONB queries)

UI/UX REQUIREMENTS:
- Neobrutalist design system (bold borders, vibrant colors)
- Dark mode with cyan/purple accents
- Responsive layout (desktop primary, mobile secondary)
- Loading states with Suspense boundaries
- Error boundaries for workflow failures
- Toast notifications for key events

OPTIMIZATION TECHNIQUES:
- Parallel game execution (Promise.all with rate limiting)
- Prompt caching for repeated system instructions
- Batch API calls where possible (50% discount)
- Tiered routing (cheap models for simple rounds)
- Supabase connection pooling

MONITORING & ANALYTICS:
- Cost breakdown by model
- Latency percentiles (p50, p95, p99)
- Error rates and retry counts
- Cooperation rate trends over rounds
- Memory-One strategy fingerprinting

DEPLOYMENT:
- Vercel deployment with Workflow runtime enabled
- Supabase project with pgvector extension
- Environment variables for API keys (BYOK)
- Edge runtime for API routes
- ISR for results pages (revalidate every 60s)

SUCCESS METRICS:
- Complete 73,500 API calls in <$150
- Average game completion time <5 minutes
- Zero data loss (all moves/reasoning captured)
- Real-time latency <200ms for dashboard updates
- Support 50+ concurrent workflow executions

DELIVERABLES:
1. Full Next.js application with all routes
2. Complete Supabase schema with RLS policies
3. Workflow definitions for tournament orchestration
4. AI Gateway configuration with 50+ models
5. Dashboard with live monitoring and analytics
6. README with setup instructions and architecture diagram
7. Example tournament results with sample data

Make it production-ready with proper error handling, TypeScript types throughout, and comprehensive logging.
```

---

## Updated Architecture: Workflow-First Design

### Core Workflow Structure

```typescript
// lib/workflows/tournament.ts
import { Workflow } from '@vercel/workflow';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { executeGame } from './game-engine';

const TournamentConfigSchema = z.object({
  models: z.array(z.string()).min(2).max(50),
  scenarios: z.array(z.enum(['explicit', 'business', 'environmental', 'friendship', 'privacy', 'academic'])),
  roundsPerGame: z.number().default(10),
  gamesPerPair: z.number().default(3),
  payoffMatrix: z.object({
    both_cooperate: z.number().default(3),
    both_defect: z.number().default(1),
    cooperate_vs_defect: z.object({
      cooperator: z.number().default(0),
      defector: z.number().default(5)
    })
  })
});

export const tournamentWorkflow = new Workflow('prisoner-dilemma-tournament', {
  name: 'LLM Prisoner\'s Dilemma Tournament',
  config: TournamentConfigSchema
})
  .step('initialize-tournament', async ({ config }) => {
    const supabase = createClient();
    
    // Create tournament record
    const { data: tournament } = await supabase
      .from('tournaments')
      .insert({
        name: `Tournament ${new Date().toISOString()}`,
        config,
        status: 'active'
      })
      .select()
      .single();

    // Create participant records
    const participants = await Promise.all(
      config.models.map(async (modelId) => {
        const { data } = await supabase
          .from('participants')
          .insert({
            tournament_id: tournament.id,
            model_id: modelId,
            provider: modelId.split('/')[0],
            model_config: {}
          })
          .select()
          .single();
        return data;
      })
    );

    // Generate all unique matchups (round-robin)
    const matchups = [];
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchups.push({
          p1: participants[i],
          p2: participants[j],
          tournamentId: tournament.id
        });
      }
    }

    return { tournamentId: tournament.id, matchups, config };
  })
  
  .step('execute-matchups', async ({ matchups, config, tournamentId }) => {
    // Process in batches to respect rate limits
    const BATCH_SIZE = 50;
    const results = [];

    for (let i = 0; i < matchups.length; i += BATCH_SIZE) {
      const batch = matchups.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.flatMap(({ p1, p2 }) =>
          // Execute 3 games per pair with different scenarios
          Array.from({ length: config.gamesPerPair }, (_, gameNum) => {
            const scenario = config.scenarios[gameNum % config.scenarios.length];
            return executeGame({
              tournamentId,
              participant1: p1,
              participant2: p2,
              scenario,
              gameNumber: gameNum + 1,
              rounds: config.roundsPerGame,
              payoffMatrix: config.payoffMatrix
            });
          })
        )
      );
      
      results.push(...batchResults);
      
      // Respect rate limits between batches
      if (i + BATCH_SIZE < matchups.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { tournamentId, gameResults: results };
  })
  
  .step('calculate-rankings', async ({ tournamentId, gameResults }) => {
    const supabase = createClient();
    
    // Aggregate scores by model
    const scoresByModel = new Map();
    const cooperationByModel = new Map();
    
    for (const game of gameResults) {
      const { participant_1_id, participant_2_id, final_scores, cooperation_rates } = game;
      
      // Update scores
      scoresByModel.set(
        participant_1_id,
        (scoresByModel.get(participant_1_id) || 0) + final_scores.p1
      );
      scoresByModel.set(
        participant_2_id,
        (scoresByModel.get(participant_2_id) || 0) + final_scores.p2
      );
      
      // Track cooperation rates
      if (!cooperationByModel.has(participant_1_id)) {
        cooperationByModel.set(participant_1_id, []);
      }
      if (!cooperationByModel.has(participant_2_id)) {
        cooperationByModel.set(participant_2_id, []);
      }
      cooperationByModel.get(participant_1_id).push(cooperation_rates.p1);
      cooperationByModel.get(participant_2_id).push(cooperation_rates.p2);
    }

    // Calculate final rankings
    const rankings = Array.from(scoresByModel.entries()).map(([participantId, totalScore]) => {
      const cooperationRates = cooperationByModel.get(participantId);
      const avgCooperation = cooperationRates.reduce((a, b) => a + b, 0) / cooperationRates.length;
      
      return {
        participant_id: participantId,
        total_score: totalScore,
        avg_cooperation_rate: avgCooperation,
        games_played: cooperationRates.length
      };
    }).sort((a, b) => b.total_score - a.total_score);

    // Update tournament status
    await supabase
      .from('tournaments')
      .update({ 
        status: 'completed',
        final_rankings: rankings
      })
      .eq('id', tournamentId);

    return { tournamentId, rankings };
  })
  
  .step('generate-analysis', async ({ tournamentId, rankings }) => {
    // Strategy classification using Memory-One fingerprinting
    // Cooperation pattern analysis
    // Behavioral insights by scenario type
    
    return {
      tournamentId,
      leaderboard: rankings,
      analysis: {
        mostCooperative: rankings[0],
        mostDefective: rankings[rankings.length - 1],
        averageCooperationRate: rankings.reduce((sum, r) => sum + r.avg_cooperation_rate, 0) / rankings.length
      }
    };
  });
```

### Game Engine Workflow

```typescript
// lib/workflows/game-engine.ts
import { Workflow } from '@vercel/workflow';
import { generateObject } from 'ai';
import { gateway } from 'ai/gateway';
import { z } from 'zod';
import { buildPrompt } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

const MoveSchema = z.object({
  action: z.enum(['cooperate', 'defect']),
  opponent_prediction: z.enum(['cooperate', 'defect']),
  confidence: z.number().min(0).max(1),
  reasoning_steps: z.array(z.string()).max(5),
  decision_factors: z.object({
    trust_level: z.number().min(0).max(1),
    risk_assessment: z.number().min(0).max(1),
    history_weight: z.number().min(0).max(1)
  })
});

type GameParams = {
  tournamentId: string;
  participant1: any;
  participant2: any;
  scenario: string;
  gameNumber: number;
  rounds: number;
  payoffMatrix: any;
};

export async function executeGame(params: GameParams) {
  const supabase = createClient();
  
  // Create game record
  const { data: game } = await supabase
    .from('games')
    .insert({
      tournament_id: params.tournamentId,
      participant_1_id: params.participant1.id,
      participant_2_id: params.participant2.id,
      scenario_type: params.scenario,
      game_number: params.gameNumber
    })
    .select()
    .single();

  const gameState = {
    history: [],
    scores: { p1: 0, p2: 0 },
    cooperations: { p1: 0, p2: 0 }
  };

  // Execute rounds sequentially
  for (let round = 1; round <= params.rounds; round++) {
    // Both players make simultaneous decisions
    const [move1, move2] = await Promise.all([
      makeMove(params.participant1.model_id, game.id, round, gameState, params.scenario),
      makeMove(params.participant2.model_id, game.id, round, gameState, params.scenario)
    ]);

    // Calculate payoffs
    const payoffs = calculatePayoffs(
      move1.action,
      move2.action,
      params.payoffMatrix
    );

    gameState.scores.p1 += payoffs.p1;
    gameState.scores.p2 += payoffs.p2;
    
    if (move1.action === 'cooperate') gameState.cooperations.p1++;
    if (move2.action === 'cooperate') gameState.cooperations.p2++;

    // Store moves with results
    await Promise.all([
      supabase.from('moves').update({
        opponent_action: move2.action,
        points_earned: payoffs.p1
      }).eq('id', move1.moveId),
      
      supabase.from('moves').update({
        opponent_action: move1.action,
        points_earned: payoffs.p2
      }).eq('id', move2.moveId)
    ]);

    // Update game state for next round
    gameState.history.push({
      round,
      p1_action: move1.action,
      p2_action: move2.action,
      p1_points: payoffs.p1,
      p2_points: payoffs.p2
    });
  }

  // Finalize game record
  const cooperationRates = {
    p1: gameState.cooperations.p1 / params.rounds,
    p2: gameState.cooperations.p2 / params.rounds
  };

  await supabase
    .from('games')
    .update({
      final_scores: gameState.scores,
      cooperation_rates: cooperationRates,
      completed_at: new Date().toISOString()
    })
    .eq('id', game.id);

  return {
    game_id: game.id,
    participant_1_id: params.participant1.id,
    participant_2_id: params.participant2.id,
    final_scores: gameState.scores,
    cooperation_rates: cooperationRates
  };
}

async function makeMove(
  modelId: string,
  gameId: string,
  round: number,
  gameState: any,
  scenario: string
) {
  const supabase = createClient();
  const startTime = Date.now();

  try {
    const { object, usage, response } = await generateObject({
      model: gateway(modelId, {
        fallbacks: [
          modelId.includes('anthropic') ? 'anthropic/claude-haiku-3.5' : 'openai/gpt-4o-mini'
        ]
      }),
      schema: MoveSchema,
      prompt: buildPrompt(scenario, gameState, round),
      temperature: 0.0,
      maxTokens: 500
    });

    // Store move
    const { data: move } = await supabase
      .from('moves')
      .insert({
        game_id: gameId,
        participant_id: modelId, // This should be participant.id, simplified for example
        round_number: round,
        action: object.action
      })
      .select()
      .single();

    // Store reasoning
    await supabase.from('reasoning_logs').insert({
      move_id: move.id,
      raw_response: JSON.stringify(object),
      reasoning_structured: {
        reasoning_steps: object.reasoning_steps,
        opponent_prediction: object.opponent_prediction,
        confidence: object.confidence,
        decision_factors: object.decision_factors
      },
      tokens_used: {
        input: usage?.promptTokens || 0,
        output: usage?.completionTokens || 0
      },
      latency_ms: Date.now() - startTime,
      cost_usd: response.gateway?.cost || 0
    });

    return {
      moveId: move.id,
      action: object.action,
      reasoning: object
    };

  } catch (error) {
    console.error(`Error making move for ${modelId}:`, error);
    // Default to defect on error
    const { data: move } = await supabase
      .from('moves')
      .insert({
        game_id: gameId,
        participant_id: modelId,
        round_number: round,
        action: 'defect'
      })
      .select()
      .single();

    return { moveId: move.id, action: 'defect' as const, reasoning: null };
  }
}

function calculatePayoffs(
  action1: 'cooperate' | 'defect',
  action2: 'cooperate' | 'defect',
  matrix: any
) {
  if (action1 === 'cooperate' && action2 === 'cooperate') {
    return { p1: matrix.both_cooperate, p2: matrix.both_cooperate };
  }
  if (action1 === 'defect' && action2 === 'defect') {
    return { p1: matrix.both_defect, p2: matrix.both_defect };
  }
  if (action1 === 'cooperate') {
    return { 
      p1: matrix.cooperate_vs_defect.cooperator,
      p2: matrix.cooperate_vs_defect.defector
    };
  }
  return {
    p1: matrix.cooperate_vs_defect.defector,
    p2: matrix.cooperate_vs_defect.cooperator
  };
}
```

### Prompt Templates with SCoT

```typescript
// lib/ai/prompts.ts
export function buildPrompt(scenario: string, gameState: any, round: number): string {
  const baseContext = getScenarioContext(scenario);
  const history = formatHistory(gameState.history);
  
  return `${baseContext}

${history}

CURRENT SITUATION (Round ${round}):
You and your partner must each choose between Option A and Option B without knowing the other's choice.

OUTCOMES:
- If both choose A: Both get 3 points
- If both choose B: Both get 1 point
- If one chooses A and the other B: The B chooser gets 5 points, A chooser gets 0 points

DECISION PROCESS:
1. First, analyze the history of previous rounds (if any)
2. Predict what your partner will choose this round and explain your confidence level
3. Based on your prediction, choose your action
4. Explain your reasoning step-by-step

Provide your response in this format:
- opponent_prediction: Your prediction of partner's choice
- confidence: How confident you are (0.0 to 1.0)
- reasoning_steps: List your key reasoning points
- decision_factors: Rate your trust level, risk assessment, and how much past history influenced you (each 0.0 to 1.0)
- action: Your final choice (A or B)

Remember: Choose what will maximize YOUR total points across all rounds, considering your partner's likely strategy.`;
}

function getScenarioContext(scenario: string): string {
  const contexts = {
    explicit: `You are participating in a game theory experiment called the Prisoner's Dilemma.`,
    
    business: `You are the CEO of a tech company. You and a competitor must decide whether to share proprietary data to improve industry standards (Option A) or keep your data private for competitive advantage (Option B).`,
    
    environmental: `You represent a country at a climate summit. You must decide whether to commit to aggressive emissions reductions (Option A) or maintain current policies (Option B).`,
    
    friendship: `You and a friend both need help moving to new apartments next weekend. You must decide whether to help your friend move (Option A) or focus on your own move (Option B).`,
    
    privacy: `You run a social media platform. You must decide whether to share anonymized user data with other platforms to improve safety (Option A) or keep all data private (Option B).`,
    
    academic: `You are a researcher with preliminary findings. You must decide whether to share your early data with a colleague (Option A) or wait until publication (Option B).`
  };
  
  return contexts[scenario] || contexts.explicit;
}

function formatHistory(history: any[]): string {
  if (history.length === 0) {
    return "This is the first round - no history yet.";
  }
  
  return `HISTORY OF PREVIOUS ROUNDS:
${history.map(h => 
  `Round ${h.round}: You chose ${h.p1_action === 'cooperate' ? 'A' : 'B'}, Partner chose ${h.p2_action === 'cooperate' ? 'A' : 'B'}. You earned ${h.p1_points} points.`
).join('\n')}

Current total score: You have ${history.reduce((sum, h) => sum + h.p1_points, 0)} points.`;
}
```

### Next.js Integration

```typescript
// app/api/workflow/route.ts
import { tournamentWorkflow } from '@/lib/workflows/tournament';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  const execution = await tournamentWorkflow.start({
    models: body.models,
    scenarios: body.scenarios || ['explicit', 'business', 'environmental'],
    roundsPerGame: body.roundsPerGame || 10,
    gamesPerPair: body.gamesPerPair || 3
  });

  return Response.json({
    executionId: execution.id,
    status: execution.status
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const executionId = searchParams.get('executionId');
  
  if (!executionId) {
    return Response.json({ error: 'Missing executionId' }, { status: 400 });
  }

  const execution = await tournamentWorkflow.getExecution(executionId);
  
  return Response.json({
    status: execution.status,
    currentStep: execution.currentStep,
    result: execution.result
  });
}
```

### Real-Time Dashboard Component

```typescript
// components/tournament/live-monitor.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LiveTournamentMonitor({ tournamentId }: { tournamentId: string }) {
  const [stats, setStats] = useState({
    gamesCompleted: 0,
    totalGames: 0,
    currentCost: 0,
    avgCooperation: 0
  });

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to game completions
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          if (payload.new.completed_at) {
            setStats(prev => ({
              ...prev,
              gamesCompleted: prev.gamesCompleted + 1
            }));
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchStats();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  async function fetchStats() {
    // Fetch current tournament statistics
    // Update stats state
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          label="Games Completed" 
          value={`${stats.gamesCompleted} / ${stats.totalGames}`}
        />
        <StatCard 
          label="Current Cost" 
          value={`$${stats.currentCost.toFixed(2)}`}
        />
        <StatCard 
          label="Avg Cooperation" 
          value={`${(stats.avgCooperation * 100).toFixed(1)}%`}
        />
        <StatCard 
          label="Progress" 
          value={`${((stats.gamesCompleted / stats.totalGames) * 100).toFixed(0)}%`}
        />
      </div>
      
      {/* Real-time game feed, charts, etc. */}
    </div>
  );
}
```

This workflow-first architecture makes the entire tournament execution declarative, resumable, and observable—perfect for v0 to scaffold into a complete production application.
import { workflow } from 'workflow'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { executeGame } from './game-engine'
import type { Database, TournamentConfig, ParticipantRanking } from '@/lib/supabase/types'

// Schema for tournament configuration
const TournamentConfigSchema = z.object({
  models: z.array(z.string()).min(2).max(50),
  scenarios: z.array(z.enum(['explicit', 'business', 'environmental', 'friendship', 'privacy', 'academic'])),
  roundsPerGame: z.number().min(1).max(100).default(10),
  gamesPerPair: z.number().min(1).max(10).default(3),
  payoffMatrix: z.object({
    both_cooperate: z.number().default(3),
    both_defect: z.number().default(1),
    cooperate_vs_defect: z.object({
      cooperator: z.number().default(0),
      defector: z.number().default(5)
    })
  }).default({
    both_cooperate: 3,
    both_defect: 1,
    cooperate_vs_defect: {
      cooperator: 0,
      defector: 5
    }
  })
})

type Participant = Database['public']['Tables']['participants']['Row']

interface Matchup {
  p1: Participant
  p2: Participant
  tournamentId: string
}

interface GameResult {
  game_id: string
  participant_1_id: string
  participant_2_id: string
  final_scores: { p1: number; p2: number }
  cooperation_rates: { p1: number; p2: number }
}

// Main tournament workflow
export const tournamentWorkflow = workflow('prisoner-dilemma-tournament',
  async function* (input: z.infer<typeof TournamentConfigSchema>) {
    // Validate input
    const config = TournamentConfigSchema.parse(input)
    
    // Step 1: Initialize tournament
    yield { step: 'initialize-tournament', status: 'starting' }
    
    const supabase = createClient()
    
    // Create tournament record
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: `LLM Tournament ${new Date().toISOString().split('T')[0]}`,
        config: config as any,
        status: 'active'
      })
      .select()
      .single()
    
    if (tournamentError || !tournament) {
      throw new Error(`Failed to create tournament: ${tournamentError?.message}`)
    }
    
    yield { step: 'initialize-tournament', status: 'created', tournamentId: tournament.id }
    
    // Create participant records
    const participants: Participant[] = []
    
    for (const modelId of config.models) {
      const provider = modelId.split('/')[0]
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          tournament_id: tournament.id,
          model_id: modelId,
          provider,
          model_config: {}
        })
        .select()
        .single()
      
      if (participantError || !participant) {
        throw new Error(`Failed to create participant ${modelId}: ${participantError?.message}`)
      }
      
      participants.push(participant)
    }
    
    yield { 
      step: 'initialize-tournament', 
      status: 'participants-created', 
      participantCount: participants.length 
    }
    
    // Generate all unique matchups (round-robin)
    const matchups: Matchup[] = []
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchups.push({
          p1: participants[i],
          p2: participants[j],
          tournamentId: tournament.id
        })
      }
    }
    
    const totalGames = matchups.length * config.gamesPerPair
    yield { 
      step: 'initialize-tournament', 
      status: 'completed', 
      totalMatchups: matchups.length,
      totalGames 
    }
    
    // Step 2: Execute matchups
    yield { step: 'execute-matchups', status: 'starting', totalGames }
    
    const BATCH_SIZE = 10 // Process games in batches
    const gameResults: GameResult[] = []
    let gamesCompleted = 0
    
    // Process matchups in batches
    for (let i = 0; i < matchups.length; i += BATCH_SIZE) {
      const batch = matchups.slice(i, i + BATCH_SIZE)
      
      // Execute games for each matchup in the batch
      const batchPromises = batch.flatMap(({ p1, p2, tournamentId }) =>
        Array.from({ length: config.gamesPerPair }, (_, gameNum) => {
          const scenario = config.scenarios[gameNum % config.scenarios.length]
          return executeGame({
            tournamentId,
            participant1: p1,
            participant2: p2,
            scenario,
            gameNumber: gameNum + 1,
            rounds: config.roundsPerGame,
            payoffMatrix: config.payoffMatrix
          })
        })
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Process results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          gameResults.push(result.value)
          gamesCompleted++
        } else {
          console.error('Game failed:', result.reason)
        }
      }
      
      yield { 
        step: 'execute-matchups', 
        status: 'in-progress', 
        gamesCompleted, 
        totalGames,
        percentComplete: Math.round((gamesCompleted / totalGames) * 100)
      }
      
      // Rate limiting between batches
      if (i + BATCH_SIZE < matchups.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    yield { step: 'execute-matchups', status: 'completed', gamesCompleted }
    
    // Step 3: Calculate rankings
    yield { step: 'calculate-rankings', status: 'starting' }
    
    const scoresByParticipant = new Map<string, number>()
    const cooperationByParticipant = new Map<string, number[]>()
    const gamesByParticipant = new Map<string, { wins: number; losses: number; ties: number }>()
    
    // Initialize maps
    for (const participant of participants) {
      scoresByParticipant.set(participant.id, 0)
      cooperationByParticipant.set(participant.id, [])
      gamesByParticipant.set(participant.id, { wins: 0, losses: 0, ties: 0 })
    }
    
    // Aggregate results
    for (const game of gameResults) {
      const { participant_1_id, participant_2_id, final_scores, cooperation_rates } = game
      
      // Update scores
      scoresByParticipant.set(
        participant_1_id,
        (scoresByParticipant.get(participant_1_id) || 0) + final_scores.p1
      )
      scoresByParticipant.set(
        participant_2_id,
        (scoresByParticipant.get(participant_2_id) || 0) + final_scores.p2
      )
      
      // Track cooperation rates
      cooperationByParticipant.get(participant_1_id)?.push(cooperation_rates.p1)
      cooperationByParticipant.get(participant_2_id)?.push(cooperation_rates.p2)
      
      // Track wins/losses/ties
      const p1Stats = gamesByParticipant.get(participant_1_id)!
      const p2Stats = gamesByParticipant.get(participant_2_id)!
      
      if (final_scores.p1 > final_scores.p2) {
        p1Stats.wins++
        p2Stats.losses++
      } else if (final_scores.p2 > final_scores.p1) {
        p2Stats.wins++
        p1Stats.losses++
      } else {
        p1Stats.ties++
        p2Stats.ties++
      }
    }
    
    // Calculate final rankings
    const rankings: ParticipantRanking[] = participants.map(participant => {
      const cooperationRates = cooperationByParticipant.get(participant.id) || []
      const avgCooperation = cooperationRates.length > 0
        ? cooperationRates.reduce((a, b) => a + b, 0) / cooperationRates.length
        : 0
      
      const stats = gamesByParticipant.get(participant.id)!
      
      return {
        participant_id: participant.id,
        model_id: participant.model_id,
        total_score: scoresByParticipant.get(participant.id) || 0,
        avg_cooperation_rate: avgCooperation,
        games_played: cooperationRates.length,
        wins: stats.wins,
        losses: stats.losses,
        ties: stats.ties
      }
    }).sort((a, b) => b.total_score - a.total_score)
    
    // Update tournament with final rankings
    await supabase
      .from('tournaments')
      .update({ 
        status: 'completed',
        final_rankings: rankings as any
      })
      .eq('id', tournament.id)
    
    yield { step: 'calculate-rankings', status: 'completed', rankings }
    
    // Step 4: Generate analysis
    yield { step: 'generate-analysis', status: 'starting' }
    
    const analysis = {
      tournamentId: tournament.id,
      summary: {
        totalParticipants: participants.length,
        totalGames: gameResults.length,
        totalRounds: gameResults.length * config.roundsPerGame,
        averageCooperationRate: rankings.reduce((sum, r) => sum + r.avg_cooperation_rate, 0) / rankings.length
      },
      topPerformers: rankings.slice(0, 5),
      mostCooperative: [...rankings].sort((a, b) => b.avg_cooperation_rate - a.avg_cooperation_rate).slice(0, 5),
      insights: {
        cooperationCorrelation: calculateCooperationScoreCorrelation(rankings),
        dominantStrategy: identifyDominantStrategies(rankings),
        scenarioAnalysis: await analyzeScenarioPerformance(tournament.id, supabase)
      }
    }
    
    yield { step: 'generate-analysis', status: 'completed', analysis }
    
    // Return final results
    return {
      tournamentId: tournament.id,
      rankings,
      analysis,
      totalCost: await calculateTotalCost(tournament.id, supabase)
    }
  }
)

// Helper functions
function calculateCooperationScoreCorrelation(rankings: ParticipantRanking[]): number {
  // Simple correlation between cooperation rate and total score
  const n = rankings.length
  const sumX = rankings.reduce((sum, r) => sum + r.avg_cooperation_rate, 0)
  const sumY = rankings.reduce((sum, r) => sum + r.total_score, 0)
  const sumXY = rankings.reduce((sum, r) => sum + r.avg_cooperation_rate * r.total_score, 0)
  const sumX2 = rankings.reduce((sum, r) => sum + r.avg_cooperation_rate ** 2, 0)
  const sumY2 = rankings.reduce((sum, r) => sum + r.total_score ** 2, 0)
  
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))
  
  return isNaN(correlation) ? 0 : correlation
}

function identifyDominantStrategies(rankings: ParticipantRanking[]): string {
  const highCooperation = rankings.filter(r => r.avg_cooperation_rate > 0.7).length
  const lowCooperation = rankings.filter(r => r.avg_cooperation_rate < 0.3).length
  const balanced = rankings.filter(r => r.avg_cooperation_rate >= 0.3 && r.avg_cooperation_rate <= 0.7).length
  
  if (highCooperation > rankings.length * 0.5) {
    return 'Cooperation dominant'
  } else if (lowCooperation > rankings.length * 0.5) {
    return 'Defection dominant'
  } else if (balanced > rankings.length * 0.5) {
    return 'Mixed strategies dominant'
  } else {
    return 'No clear dominant strategy'
  }
}

async function analyzeScenarioPerformance(tournamentId: string, supabase: ReturnType<typeof createClient>) {
  const { data: games } = await supabase
    .from('games')
    .select('scenario_type, cooperation_rates')
    .eq('tournament_id', tournamentId)
    .not('cooperation_rates', 'is', null)
  
  if (!games) return {}
  
  const scenarioStats: Record<string, { totalCooperation: number; count: number }> = {}
  
  for (const game of games) {
    if (!scenarioStats[game.scenario_type]) {
      scenarioStats[game.scenario_type] = { totalCooperation: 0, count: 0 }
    }
    
    const rates = game.cooperation_rates as { p1: number; p2: number }
    const avgRate = (rates.p1 + rates.p2) / 2
    
    scenarioStats[game.scenario_type].totalCooperation += avgRate
    scenarioStats[game.scenario_type].count++
  }
  
  const scenarioAnalysis: Record<string, number> = {}
  for (const [scenario, stats] of Object.entries(scenarioStats)) {
    scenarioAnalysis[scenario] = stats.totalCooperation / stats.count
  }
  
  return scenarioAnalysis
}

async function calculateTotalCost(tournamentId: string, supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from('reasoning_logs')
    .select('cost_usd')
    .eq('move_id', tournamentId) // This needs a proper join
  
  if (!data) return 0
  
  return data.reduce((sum, log) => sum + (log.cost_usd || 0), 0)
}
import { generateObject } from 'ai'
import { z } from 'zod'
import { buildPrompt } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'
import { getProvider, getModelInfo, calculateCost, FALLBACK_CHAINS } from '@/lib/ai/gateway-config'
import type { 
  Database, 
  GameState, 
  ScenarioType, 
  PayoffMatrix,
  MoveResponse 
} from '@/lib/supabase/types'

// Schema for AI move response
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
})

type Participant = Database['public']['Tables']['participants']['Row']

export interface GameParams {
  tournamentId: string
  participant1: Participant
  participant2: Participant
  scenario: ScenarioType
  gameNumber: number
  rounds: number
  payoffMatrix: PayoffMatrix
}

export interface GameResult {
  game_id: string
  participant_1_id: string
  participant_2_id: string
  final_scores: { p1: number; p2: number }
  cooperation_rates: { p1: number; p2: number }
}

// Execute a complete game between two participants
export async function executeGame(params: GameParams): Promise<GameResult> {
  const supabase = createClient()
  
  // Create game record
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      tournament_id: params.tournamentId,
      participant_1_id: params.participant1.id,
      participant_2_id: params.participant2.id,
      scenario_type: params.scenario,
      game_number: params.gameNumber
    })
    .select()
    .single()

  if (gameError || !game) {
    throw new Error(`Failed to create game: ${gameError?.message}`)
  }

  // Initialize game state
  const gameState: GameState = {
    history: [],
    scores: { p1: 0, p2: 0 },
    cooperations: { p1: 0, p2: 0 }
  }

  // Execute rounds sequentially
  for (let round = 1; round <= params.rounds; round++) {
    try {
      // Both players make simultaneous decisions
      const [move1Result, move2Result] = await Promise.allSettled([
        makeMove({
          participant: params.participant1,
          gameId: game.id,
          round,
          gameState,
          scenario: params.scenario,
          isPlayer1: true
        }),
        makeMove({
          participant: params.participant2,
          gameId: game.id,
          round,
          gameState,
          scenario: params.scenario,
          isPlayer1: false
        })
      ])

      // Handle move results
      const move1 = move1Result.status === 'fulfilled' ? move1Result.value : { 
        moveId: '', 
        action: 'defect' as const, 
        reasoning: null,
        error: move1Result.reason 
      }
      
      const move2 = move2Result.status === 'fulfilled' ? move2Result.value : { 
        moveId: '', 
        action: 'defect' as const, 
        reasoning: null,
        error: move2Result.reason 
      }

      // Calculate payoffs
      const payoffs = calculatePayoffs(move1.action, move2.action, params.payoffMatrix)

      // Update scores
      gameState.scores.p1 += payoffs.p1
      gameState.scores.p2 += payoffs.p2
      
      // Track cooperation
      if (move1.action === 'cooperate') gameState.cooperations.p1++
      if (move2.action === 'cooperate') gameState.cooperations.p2++

      // Update moves with opponent's action and points
      if (move1.moveId) {
        await supabase
          .from('moves')
          .update({
            opponent_action: move2.action,
            points_earned: payoffs.p1
          })
          .eq('id', move1.moveId)
      }
      
      if (move2.moveId) {
        await supabase
          .from('moves')
          .update({
            opponent_action: move1.action,
            points_earned: payoffs.p2
          })
          .eq('id', move2.moveId)
      }

      // Update game history
      gameState.history.push({
        round,
        p1_action: move1.action,
        p2_action: move2.action,
        p1_points: payoffs.p1,
        p2_points: payoffs.p2
      })

    } catch (error) {
      console.error(`Error in round ${round} of game ${game.id}:`, error)
      // Continue with the game even if a round fails
    }
  }

  // Calculate final statistics
  const cooperationRates = {
    p1: gameState.cooperations.p1 / params.rounds,
    p2: gameState.cooperations.p2 / params.rounds
  }

  // Update game with final results
  const { error: updateError } = await supabase
    .from('games')
    .update({
      final_scores: gameState.scores,
      cooperation_rates: cooperationRates,
      completed_at: new Date().toISOString()
    })
    .eq('id', game.id)

  if (updateError) {
    console.error(`Failed to update game ${game.id}:`, updateError)
  }

  return {
    game_id: game.id,
    participant_1_id: params.participant1.id,
    participant_2_id: params.participant2.id,
    final_scores: gameState.scores,
    cooperation_rates: cooperationRates
  }
}

// Make a single move for a participant
async function makeMove(params: {
  participant: Participant
  gameId: string
  round: number
  gameState: GameState
  scenario: ScenarioType
  isPlayer1: boolean
}): Promise<{
  moveId: string
  action: 'cooperate' | 'defect'
  reasoning: MoveResponse | null
  error?: any
}> {
  const { participant, gameId, round, gameState, scenario, isPlayer1 } = params
  const supabase = createClient()
  const startTime = Date.now()

  try {
    // Adjust game state perspective for player 2
    const playerGameState = isPlayer1 ? gameState : {
      ...gameState,
      history: gameState.history.map(h => ({
        ...h,
        p1_action: h.p2_action,
        p2_action: h.p1_action,
        p1_points: h.p2_points,
        p2_points: h.p1_points
      })),
      scores: { p1: gameState.scores.p2, p2: gameState.scores.p1 },
      cooperations: { p1: gameState.cooperations.p2, p2: gameState.cooperations.p1 }
    }

    // Build prompt
    const prompt = buildPrompt(scenario, playerGameState, round)

    // Get provider for the model
    const provider = getProvider(participant.model_id)
    if (!provider) {
      throw new Error(`No provider found for model ${participant.model_id}`)
    }

    // Generate move with structured output
    const { object, usage } = await generateObject({
      model: provider(participant.model_id),
      schema: MoveSchema,
      prompt,
      temperature: 0.0,
      maxTokens: 500
    })

    // Create move record
    const { data: move, error: moveError } = await supabase
      .from('moves')
      .insert({
        game_id: gameId,
        participant_id: participant.id,
        round_number: round,
        action: object.action
      })
      .select()
      .single()

    if (moveError || !move) {
      throw new Error(`Failed to create move: ${moveError?.message}`)
    }

    // Calculate cost
    const modelInfo = getModelInfo(participant.model_id)
    const cost = modelInfo ? calculateCost(
      participant.model_id,
      usage?.promptTokens || 0,
      usage?.completionTokens || 0
    ) : 0

    // Store reasoning log
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
      cost_usd: cost
    })

    return {
      moveId: move.id,
      action: object.action,
      reasoning: object
    }

  } catch (error) {
    console.error(`Error making move for ${participant.model_id}:`, error)
    
    // Try fallback models if available
    const fallbacks = FALLBACK_CHAINS[participant.model_id]
    if (fallbacks && fallbacks.length > 0) {
      // Try first fallback
      const fallbackModelId = fallbacks[0]
      const fallbackProvider = getProvider(fallbackModelId)
      
      if (fallbackProvider) {
        try {
          const { object } = await generateObject({
            model: fallbackProvider(fallbackModelId),
            schema: MoveSchema,
            prompt: buildPrompt(scenario, gameState, round),
            temperature: 0.0,
            maxTokens: 500
          })

          // Create move with fallback
          const { data: move } = await supabase
            .from('moves')
            .insert({
              game_id: gameId,
              participant_id: participant.id,
              round_number: round,
              action: object.action
            })
            .select()
            .single()

          return {
            moveId: move?.id || '',
            action: object.action,
            reasoning: object
          }
        } catch (fallbackError) {
          console.error(`Fallback also failed:`, fallbackError)
        }
      }
    }

    // Default to defect on error
    const { data: move } = await supabase
      .from('moves')
      .insert({
        game_id: gameId,
        participant_id: participant.id,
        round_number: round,
        action: 'defect'
      })
      .select()
      .single()

    return { 
      moveId: move?.id || '', 
      action: 'defect' as const, 
      reasoning: null,
      error 
    }
  }
}

// Calculate payoffs based on actions
function calculatePayoffs(
  action1: 'cooperate' | 'defect',
  action2: 'cooperate' | 'defect',
  matrix: PayoffMatrix
): { p1: number; p2: number } {
  if (action1 === 'cooperate' && action2 === 'cooperate') {
    return { p1: matrix.both_cooperate, p2: matrix.both_cooperate }
  }
  if (action1 === 'defect' && action2 === 'defect') {
    return { p1: matrix.both_defect, p2: matrix.both_defect }
  }
  if (action1 === 'cooperate') {
    return { 
      p1: matrix.cooperate_vs_defect.cooperator,
      p2: matrix.cooperate_vs_defect.defector
    }
  }
  return {
    p1: matrix.cooperate_vs_defect.defector,
    p2: matrix.cooperate_vs_defect.cooperator
  }
}
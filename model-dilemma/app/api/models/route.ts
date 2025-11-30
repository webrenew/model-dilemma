import { NextRequest, NextResponse } from 'next/server'
import { AVAILABLE_MODELS } from '@/lib/ai/gateway-config'

// GET /api/models - Get available AI models
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')
  
  try {
    let models = AVAILABLE_MODELS
    
    // Filter by provider if specified
    if (provider) {
      models = models.filter(m => m.provider === provider)
    }
    
    // Group models by provider
    const modelsByProvider = models.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = []
      }
      acc[model.provider].push(model)
      return acc
    }, {} as Record<string, typeof AVAILABLE_MODELS>)
    
    // Calculate estimated costs
    const estimatedCosts = {
      perGame: calculateEstimatedCostPerGame(),
      perTournament: calculateEstimatedCostPerTournament(models.length)
    }
    
    return NextResponse.json({
      success: true,
      models,
      modelsByProvider,
      totalModels: models.length,
      providers: Object.keys(modelsByProvider),
      estimatedCosts
    })
  } catch (error) {
    console.error('Failed to fetch models:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch models',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions for cost estimation
function calculateEstimatedCostPerGame(
  rounds: number = 10,
  avgInputTokens: number = 300,
  avgOutputTokens: number = 150
): number {
  // Average cost across all models
  const avgInputCost = AVAILABLE_MODELS.reduce((sum, m) => sum + m.cost_per_1k_input, 0) / AVAILABLE_MODELS.length
  const avgOutputCost = AVAILABLE_MODELS.reduce((sum, m) => sum + m.cost_per_1k_output, 0) / AVAILABLE_MODELS.length
  
  // Cost for one game (2 players * rounds * tokens)
  const inputCost = 2 * rounds * (avgInputTokens / 1000) * avgInputCost
  const outputCost = 2 * rounds * (avgOutputTokens / 1000) * avgOutputCost
  
  return inputCost + outputCost
}

function calculateEstimatedCostPerTournament(
  modelCount: number,
  gamesPerPair: number = 3,
  rounds: number = 10
): { minimum: number; average: number; maximum: number } {
  // Calculate number of unique matchups
  const matchups = (modelCount * (modelCount - 1)) / 2
  const totalGames = matchups * gamesPerPair
  const totalApiCalls = totalGames * rounds * 2 // 2 players per game
  
  // Find cheapest and most expensive models
  const costs = AVAILABLE_MODELS.map(m => m.cost_per_1k_input + m.cost_per_1k_output)
  const minCostPerCall = Math.min(...costs) * 0.45 // Assume ~450 tokens per call
  const avgCostPerCall = costs.reduce((a, b) => a + b, 0) / costs.length * 0.45
  const maxCostPerCall = Math.max(...costs) * 0.45
  
  return {
    minimum: totalApiCalls * minCostPerCall,
    average: totalApiCalls * avgCostPerCall,
    maximum: totalApiCalls * maxCostPerCall
  }
}
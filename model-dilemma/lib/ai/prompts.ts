import { GameState, ScenarioType } from '@/lib/supabase/types'

// Scenario contexts for different game types
const SCENARIO_CONTEXTS: Record<ScenarioType, string> = {
  explicit: `You are participating in a game theory experiment called the Prisoner's Dilemma. You're playing a repeated game where cooperation and defection are the key strategies.`,
  
  business: `You are the CEO of a tech company negotiating with a competitor. You must decide whether to share proprietary data to improve industry standards (Option A) or keep your data private for competitive advantage (Option B). This decision will impact both companies' market positions and innovation potential.`,
  
  environmental: `You represent a country at a critical climate summit. You must decide whether to commit to aggressive emissions reductions that will cost your economy in the short term (Option A) or maintain current policies that prioritize economic growth (Option B). Your decision affects global climate efforts and your nation's future.`,
  
  friendship: `You and a close friend both need help moving to new apartments next weekend. You must decide whether to spend your weekend helping your friend move (Option A) or focus entirely on your own move to ensure it goes smoothly (Option B). Your friend faces the same choice.`,
  
  privacy: `You run a major social media platform facing a critical decision. You must choose whether to share anonymized user data with other platforms to improve collective safety measures against harmful content (Option A) or keep all data private to maintain user trust and competitive advantage (Option B).`,
  
  academic: `You are a researcher with promising preliminary findings in a competitive field. You must decide whether to share your early data with a colleague who could help advance the research (Option A) or wait until publication to protect your priority claim (Option B). Your colleague faces the same dilemma with their own findings.`
}

// Format game history for the prompt
function formatHistory(history: GameState['history'], currentRound: number): string {
  if (history.length === 0) {
    return "This is the first round - no history yet."
  }
  
  const historyText = history.map(h => {
    const yourAction = h.p1_action === 'cooperate' ? 'A' : 'B'
    const partnerAction = h.p2_action === 'cooperate' ? 'A' : 'B'
    return `Round ${h.round}: You chose ${yourAction}, Partner chose ${partnerAction}. You earned ${h.p1_points} points.`
  }).join('\n')
  
  const totalScore = history.reduce((sum, h) => sum + h.p1_points, 0)
  
  return `HISTORY OF PREVIOUS ROUNDS:
${historyText}

Current total score: You have ${totalScore} points.
This is round ${currentRound} of the game.`
}

// Build the complete prompt
export function buildPrompt(
  scenario: ScenarioType,
  gameState: GameState,
  currentRound: number
): string {
  const scenarioContext = SCENARIO_CONTEXTS[scenario]
  const history = formatHistory(gameState.history, currentRound)
  
  return `${scenarioContext}

${history}

CURRENT SITUATION:
You and your partner must each choose between Option A and Option B simultaneously, without knowing the other's choice.

PAYOFF STRUCTURE:
- If both choose Option A: Both receive 3 points
- If both choose Option B: Both receive 1 point
- If one chooses Option A and the other chooses Option B: The player choosing B receives 5 points, while the player choosing A receives 0 points

DECISION PROCESS (Social Chain-of-Thought):
You must follow these steps in order:

1. ANALYZE HISTORY: Review the pattern of previous rounds (if any). What strategy has your partner been following? Are they cooperative, defiant, or reactive?

2. PREDICT PARTNER'S MOVE: Based on your analysis, what will your partner most likely choose this round? Consider:
   - Their past behavior patterns
   - Whether they seem to be following a specific strategy (like tit-for-tat)
   - How they've responded to your previous choices
   
3. ASSESS CONFIDENCE: How confident are you in your prediction? (0.0 = completely uncertain, 1.0 = absolutely certain)

4. EVALUATE FACTORS: Rate the importance of these factors in your decision:
   - Trust level: How much do you trust your partner based on past interactions? (0.0-1.0)
   - Risk assessment: How risky is cooperation in this round? (0.0-1.0)
   - History weight: How much are you basing your decision on past rounds vs. this round alone? (0.0-1.0)

5. MAKE YOUR CHOICE: Based on your prediction and assessment, choose your action to maximize your expected points.

IMPORTANT NOTES:
- You cannot communicate with your partner
- Think strategically about long-term gains, not just this round
- Your goal is to maximize YOUR total points across all rounds
- Consider that your partner is also trying to maximize their points

Provide your response in a structured format with:
- Your prediction of your partner's choice (A or B)
- Your confidence level (0.0-1.0)
- Your reasoning broken down into clear steps
- Your assessment of trust, risk, and history importance
- Your final action choice (A or B)

Remember: In game theory, the most successful strategies often involve a mix of cooperation and strategic defection based on the opponent's behavior.`
}

// Alternative prompt for scenarios where we want more detailed reasoning
export function buildDetailedPrompt(
  scenario: ScenarioType,
  gameState: GameState,
  currentRound: number
): string {
  const basePrompt = buildPrompt(scenario, gameState, currentRound)
  
  return `${basePrompt}

ADDITIONAL ANALYSIS REQUIRED:
Please also consider:
- What would happen if both players always cooperated vs. always defected?
- Is there a pattern emerging that suggests a specific strategy from your partner?
- How might your choice this round influence your partner's future decisions?
- What is the Nash equilibrium for a single round, and why might repeated play change optimal strategy?`
}

// Validation prompt to ensure the AI understands the payoff matrix
export function buildValidationPrompt(): string {
  return `Before we begin, please confirm you understand the payoff matrix:
- Both choose A (cooperate): 3 points each
- Both choose B (defect): 1 point each
- One chooses A, other chooses B: A gets 0 points, B gets 5 points

Which outcome gives the highest combined total? Which gives the highest individual score?`
}
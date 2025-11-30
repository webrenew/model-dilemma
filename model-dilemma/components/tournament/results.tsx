'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Handshake,
  Swords,
  BarChart3,
  Brain
} from 'lucide-react'
import type { ParticipantRanking } from '@/lib/supabase/types'

interface TournamentResultsProps {
  tournamentId: string
}

export function TournamentResults({ tournamentId }: TournamentResultsProps) {
  const [rankings, setRankings] = useState<ParticipantRanking[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResults()
  }, [tournamentId])

  async function fetchResults() {
    const supabase = createClient()
    
    try {
      // Get tournament with final rankings
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('final_rankings')
        .eq('id', tournamentId)
        .single()

      if (tournament?.final_rankings) {
        setRankings(tournament.final_rankings as ParticipantRanking[])
      }

      // Get detailed game analysis
      const { data: games } = await supabase
        .from('games')
        .select(`
          *,
          participant_1:participants!participant_1_id(model_id),
          participant_2:participants!participant_2_id(model_id)
        `)
        .eq('tournament_id', tournamentId)

      if (games) {
        const analysisData = analyzeGames(games)
        setAnalysis(analysisData)
      }
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  function analyzeGames(games: any[]): any {
    // Strategy analysis
    const strategies = new Map<string, string>()
    const cooperationByScenario = new Map<string, number[]>()
    
    // Analyze cooperation patterns
    games.forEach(game => {
      if (!game.cooperation_rates) return
      
      const scenario = game.scenario_type
      if (!cooperationByScenario.has(scenario)) {
        cooperationByScenario.set(scenario, [])
      }
      
      const avgRate = (game.cooperation_rates.p1 + game.cooperation_rates.p2) / 2
      cooperationByScenario.get(scenario)!.push(avgRate)
    })

    // Calculate scenario averages
    const scenarioStats = Array.from(cooperationByScenario.entries()).map(([scenario, rates]) => ({
      scenario,
      avgCooperation: rates.reduce((a, b) => a + b, 0) / rates.length,
      gameCount: rates.length
    }))

    return {
      totalGames: games.length,
      scenarioStats,
      strategies
    }
  }

  if (loading) {
    return <Card className="p-12 text-center">Loading results...</Card>
  }

  return (
    <div className="space-y-6">
      {/* Top 3 Winners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rankings.slice(0, 3).map((participant, index) => (
          <Card key={participant.participant_id} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className={`h-8 w-8 ${
                index === 0 ? 'text-yellow-500' :
                index === 1 ? 'text-gray-400' :
                'text-orange-500'
              }`} />
              <div>
                <p className="text-sm text-muted-foreground">#{index + 1}</p>
                <p className="font-semibold">{participant.model_id}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Score</span>
                <span className="font-semibold">{participant.total_score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cooperation</span>
                <span>{(participant.avg_cooperation_rate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <span>
                  {((participant.wins / participant.games_played) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Results Tabs */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Complete Rankings</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-2">Rank</th>
                    <th className="pb-2">Model</th>
                    <th className="pb-2 text-right">Score</th>
                    <th className="pb-2 text-right">Cooperation</th>
                    <th className="pb-2 text-right">W/L/T</th>
                    <th className="pb-2 text-right">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((participant, index) => (
                    <tr key={participant.participant_id} className="border-b">
                      <td className="py-2">{index + 1}</td>
                      <td className="py-2 font-mono text-sm">{participant.model_id}</td>
                      <td className="py-2 text-right">{participant.total_score}</td>
                      <td className="py-2 text-right">
                        {(participant.avg_cooperation_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right">
                        {participant.wins}/{participant.losses}/{participant.ties}
                      </td>
                      <td className="py-2 text-right">{participant.games_played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="strategies">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Strategy Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Handshake className="h-4 w-4" />
                  Most Cooperative
                </h4>
                <div className="space-y-2">
                  {rankings
                    .sort((a, b) => b.avg_cooperation_rate - a.avg_cooperation_rate)
                    .slice(0, 5)
                    .map(p => (
                      <div key={p.participant_id} className="flex justify-between">
                        <span className="font-mono text-sm">{p.model_id}</span>
                        <Badge variant="outline">
                          {(p.avg_cooperation_rate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  Most Competitive
                </h4>
                <div className="space-y-2">
                  {rankings
                    .sort((a, b) => a.avg_cooperation_rate - b.avg_cooperation_rate)
                    .slice(0, 5)
                    .map(p => (
                      <div key={p.participant_id} className="flex justify-between">
                        <span className="font-mono text-sm">{p.model_id}</span>
                        <Badge variant="outline">
                          {(p.avg_cooperation_rate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Scenario Analysis
            </h3>
            {analysis?.scenarioStats && (
              <div className="space-y-3">
                {analysis.scenarioStats
                  .sort((a: any, b: any) => b.avgCooperation - a.avgCooperation)
                  .map((stat: any) => (
                    <div key={stat.scenario} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold capitalize">
                          {stat.scenario.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {stat.gameCount} games
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-background rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${stat.avgCooperation * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">
                          {(stat.avgCooperation * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key Insights */}
      <Card className="p-6 bg-muted/50">
        <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
        <div className="space-y-2 text-sm">
          <p>
            • The average cooperation rate across all games was{' '}
            <span className="font-semibold">
              {(rankings.reduce((sum, r) => sum + r.avg_cooperation_rate, 0) / rankings.length * 100).toFixed(1)}%
            </span>
          </p>
          <p>
            • The most successful strategy balanced cooperation and competition
          </p>
          <p>
            • Scenario framing significantly impacted cooperation rates
          </p>
        </div>
      </Card>
    </div>
  )
}
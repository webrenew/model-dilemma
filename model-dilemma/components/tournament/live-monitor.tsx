'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  DollarSign, 
  Users, 
  TrendingUp,
  Clock,
  BarChart3
} from 'lucide-react'

interface TournamentStats {
  gamesCompleted: number
  totalGames: number
  currentCost: number
  avgCooperation: number
  participantCount: number
  estimatedTimeRemaining: number
}

interface LiveGame {
  id: string
  participant1: string
  participant2: string
  scenario: string
  currentRound: number
  totalRounds: number
  scores: { p1: number; p2: number }
}

interface LiveMonitorProps {
  tournamentId: string
  workflowId?: string
}

export function LiveTournamentMonitor({ tournamentId, workflowId }: LiveMonitorProps) {
  const [stats, setStats] = useState<TournamentStats>({
    gamesCompleted: 0,
    totalGames: 0,
    currentCost: 0,
    avgCooperation: 0,
    participantCount: 0,
    estimatedTimeRemaining: 0
  })
  const [liveGames, setLiveGames] = useState<LiveGame[]>([])
  const [workflowStatus, setWorkflowStatus] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial data fetch
    fetchTournamentStats()
    if (workflowId) {
      fetchWorkflowStatus()
    }

    // Set up real-time subscriptions
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Game update:', payload)
          fetchTournamentStats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moves',
          filter: `game_id=in.(select id from games where tournament_id='${tournamentId}')`
        },
        (payload) => {
          console.log('Move update:', payload)
          // Update live games display
        }
      )
      .subscribe()

    // Poll for workflow status if needed
    const interval = workflowId ? setInterval(() => {
      fetchWorkflowStatus()
    }, 5000) : null

    return () => {
      supabase.removeChannel(channel)
      if (interval) clearInterval(interval)
    }
  }, [tournamentId, workflowId])

  async function fetchTournamentStats() {
    const supabase = createClient()

    try {
      // Get tournament stats
      const { data: stats } = await supabase
        .from('tournament_stats')
        .select('*')
        .eq('tournament_id', tournamentId)
        .single()

      if (stats) {
        setStats({
          gamesCompleted: stats.completed_games || 0,
          totalGames: stats.total_games || 0,
          currentCost: stats.total_cost || 0,
          avgCooperation: stats.avg_cooperation_rate || 0,
          participantCount: stats.participant_count || 0,
          estimatedTimeRemaining: estimateTimeRemaining(
            stats.completed_games || 0,
            stats.total_games || 0
          )
        })
      }

      // Get active games
      const { data: activeGames } = await supabase
        .from('games')
        .select(`
          *,
          participant_1:participants!participant_1_id(model_id),
          participant_2:participants!participant_2_id(model_id),
          moves(count)
        `)
        .eq('tournament_id', tournamentId)
        .is('completed_at', null)
        .limit(5)

      if (activeGames) {
        setLiveGames(activeGames.map(game => ({
          id: game.id,
          participant1: game.participant_1.model_id,
          participant2: game.participant_2.model_id,
          scenario: game.scenario_type,
          currentRound: game.moves[0]?.count || 0,
          totalRounds: 10, // From config
          scores: game.final_scores || { p1: 0, p2: 0 }
        })))
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  async function fetchWorkflowStatus() {
    if (!workflowId) return

    try {
      const res = await fetch(`/api/workflow?runId=${workflowId}`)
      const data = await res.json()
      
      if (data.success) {
        setWorkflowStatus(data)
        
        // Update stats from workflow data if available
        if (data.currentStep?.includes('execute-matchups') && data.currentStep?.gamesCompleted) {
          setStats(prev => ({
            ...prev,
            gamesCompleted: data.currentStep.gamesCompleted,
            totalGames: data.currentStep.totalGames
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching workflow status:', error)
    }
  }

  function estimateTimeRemaining(completed: number, total: number): number {
    if (completed === 0 || total === 0) return 0
    const avgTimePerGame = 30 // seconds
    const remaining = total - completed
    return remaining * avgTimePerGame
  }

  const progress = stats.totalGames > 0 
    ? (stats.gamesCompleted / stats.totalGames) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Progress"
          value={`${stats.gamesCompleted} / ${stats.totalGames}`}
          subtext={`${progress.toFixed(0)}% complete`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Current Cost"
          value={`$${stats.currentCost.toFixed(2)}`}
          subtext="Total spent"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg Cooperation"
          value={`${(stats.avgCooperation * 100).toFixed(1)}%`}
          subtext="Across all games"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Time Remaining"
          value={formatTime(stats.estimatedTimeRemaining)}
          subtext="Estimated"
        />
      </div>

      {/* Progress Bar */}
      <Card className="p-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tournament Progress</span>
            <span className="text-muted-foreground">
              {stats.gamesCompleted} of {stats.totalGames} games
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          {workflowStatus?.currentStep && (
            <p className="text-sm text-muted-foreground mt-2">
              Current step: {workflowStatus.currentStep}
            </p>
          )}
        </div>
      </Card>

      {/* Live Games */}
      {liveGames.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Games
          </h3>
          <div className="space-y-3">
            {liveGames.map(game => (
              <div key={game.id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-mono text-sm">{game.participant1}</p>
                    <p className="text-xs text-muted-foreground">vs</p>
                    <p className="font-mono text-sm">{game.participant2}</p>
                  </div>
                  <Badge variant="outline">{game.scenario}</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Round {game.currentRound}/{game.totalRounds}
                  </span>
                  <span>
                    Score: {game.scores.p1} - {game.scores.p2}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Model Performance Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Top Performers (Live)
        </h3>
        <p className="text-sm text-muted-foreground">
          Real-time rankings will appear here as games complete...
        </p>
      </Card>
    </div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{subtext}</div>
    </Card>
  )
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
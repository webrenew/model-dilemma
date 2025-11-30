import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LiveTournamentMonitor } from '@/components/tournament/live-monitor'
import { TournamentResults } from '@/components/tournament/results'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'

export default async function TournamentPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = createClient()
  
  // Check if ID is a workflow run ID or tournament ID
  const isWorkflowId = params.id.includes('-')
  
  let tournament = null
  let workflowStatus = null
  
  if (isWorkflowId) {
    // Get workflow status
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/workflow?runId=${params.id}`, {
      cache: 'no-store'
    })
    
    if (res.ok) {
      const data = await res.json()
      workflowStatus = data
      
      if (data.output?.tournamentId) {
        const { data: tournamentData } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', data.output.tournamentId)
          .single()
        
        tournament = tournamentData
      }
    }
  } else {
    // Get tournament directly
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', params.id)
      .single()
    
    tournament = tournamentData
  }
  
  if (!tournament && !workflowStatus) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-light mb-2">
          {tournament?.name || 'Tournament in Progress'}
        </h1>
        {workflowStatus && (
          <p className="text-muted-foreground">
            Workflow Status: {workflowStatus.status} 
            {workflowStatus.currentStep && ` • ${workflowStatus.currentStep}`}
          </p>
        )}
      </div>

      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="monitor">Live Monitor</TabsTrigger>
          <TabsTrigger value="results" disabled={tournament?.status !== 'completed'}>
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <Suspense fallback={<LoadingCard />}>
            <LiveTournamentMonitor 
              tournamentId={tournament?.id || params.id}
              workflowId={isWorkflowId ? params.id : undefined}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="results">
          {tournament?.status === 'completed' ? (
            <Suspense fallback={<LoadingCard />}>
              <TournamentResults tournamentId={tournament.id} />
            </Suspense>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Results will be available once the tournament is complete
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LoadingCard() {
  return (
    <Card className="p-12 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-muted-foreground">Loading tournament data...</p>
    </Card>
  )
}
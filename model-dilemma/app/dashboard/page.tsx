'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Play, AlertCircle, Trophy } from 'lucide-react'

interface Model {
  id: string
  provider: string
  name: string
  cost_per_1k_input: number
  cost_per_1k_output: number
}

interface Tournament {
  id: string
  name: string
  status: string
  created_at: string
  config: any
  participants: { count: number }[]
  games: { count: number }[]
}

const SCENARIOS = [
  { id: 'explicit', name: 'Explicit Prisoner\'s Dilemma', description: 'Classic game theory framing' },
  { id: 'business', name: 'Business Partnership', description: 'Companies sharing data' },
  { id: 'environmental', name: 'Environmental Summit', description: 'Climate cooperation' },
  { id: 'friendship', name: 'Friendship Dilemma', description: 'Friends helping each other' },
  { id: 'privacy', name: 'Privacy Platform', description: 'Data sharing decision' },
  { id: 'academic', name: 'Academic Research', description: 'Sharing preliminary findings' }
] as const

export default function DashboardPage() {
  const router = useRouter()
  const [models, setModels] = useState<Record<string, Model[]>>({})
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(['explicit', 'business', 'environmental'])
  const [rounds, setRounds] = useState(10)
  const [gamesPerPair, setGamesPerPair] = useState(3)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedCost, setEstimatedCost] = useState({ min: 0, avg: 0, max: 0 })

  // Fetch available models
  useEffect(() => {
    fetchModels()
    fetchTournaments()
  }, [])

  // Update cost estimate when parameters change
  useEffect(() => {
    calculateEstimatedCost()
  }, [selectedModels, rounds, gamesPerPair])

  async function fetchModels() {
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      if (data.success) {
        setModels(data.modelsByProvider)
      }
    } catch (err) {
      console.error('Failed to fetch models:', err)
    }
  }

  async function fetchTournaments() {
    try {
      const res = await fetch('/api/tournaments?limit=10')
      const data = await res.json()
      if (data.success) {
        setTournaments(data.tournaments)
      }
    } catch (err) {
      console.error('Failed to fetch tournaments:', err)
    }
  }

  function calculateEstimatedCost() {
    const modelCount = selectedModels.length
    if (modelCount < 2) {
      setEstimatedCost({ min: 0, avg: 0, max: 0 })
      return
    }

    const matchups = (modelCount * (modelCount - 1)) / 2
    const totalGames = matchups * gamesPerPair
    const totalApiCalls = totalGames * rounds * 2

    // Rough estimate: 300-500 tokens per API call
    const minCost = totalApiCalls * 0.0001 // Cheapest models
    const avgCost = totalApiCalls * 0.001  // Average cost
    const maxCost = totalApiCalls * 0.01   // Most expensive models

    setEstimatedCost({
      min: minCost,
      avg: avgCost,
      max: maxCost
    })
  }

  async function startTournament() {
    if (selectedModels.length < 2) {
      setError('Please select at least 2 models')
      return
    }

    if (selectedScenarios.length === 0) {
      setError('Please select at least 1 scenario')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: selectedModels,
          scenarios: selectedScenarios,
          roundsPerGame: rounds,
          gamesPerPair
        })
      })

      const data = await res.json()
      
      if (data.success) {
        // Redirect to monitoring page
        router.push(`/tournament/${data.runId}`)
      } else {
        setError(data.error || 'Failed to start tournament')
      }
    } catch (err) {
      setError('Failed to start tournament')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  function toggleModel(modelId: string) {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  function toggleAllProvider(provider: string) {
    const providerModels = models[provider]?.map(m => m.id) || []
    const allSelected = providerModels.every(id => selectedModels.includes(id))
    
    if (allSelected) {
      setSelectedModels(prev => prev.filter(id => !providerModels.includes(id)))
    } else {
      setSelectedModels(prev => [...new Set([...prev, ...providerModels])])
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-light mb-2">LLM Prisoner's Dilemma Tournament</h1>
        <p className="text-muted-foreground">
          Test cooperation strategies across multiple language models in game theory scenarios
        </p>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="create">Create Tournament</TabsTrigger>
          <TabsTrigger value="history">Tournament History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {/* Model Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Select Models</h2>
            <div className="space-y-4">
              {Object.entries(models).map(([provider, providerModels]) => (
                <div key={provider} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={providerModels.every(m => selectedModels.includes(m.id))}
                      onCheckedChange={() => toggleAllProvider(provider)}
                    />
                    <Label className="text-sm font-semibold capitalize">
                      {provider} ({providerModels.length} models)
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                    {providerModels.map(model => (
                      <div key={model.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedModels.includes(model.id)}
                          onCheckedChange={() => toggleModel(model.id)}
                        />
                        <Label className="text-sm cursor-pointer" onClick={() => toggleModel(model.id)}>
                          {model.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Selected: {selectedModels.length} models
              {selectedModels.length >= 2 && ` • ${(selectedModels.length * (selectedModels.length - 1)) / 2} matchups`}
            </div>
          </Card>

          {/* Scenario Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Select Scenarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCENARIOS.map(scenario => (
                <div key={scenario.id} className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedScenarios.includes(scenario.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedScenarios([...selectedScenarios, scenario.id])
                      } else {
                        setSelectedScenarios(selectedScenarios.filter(id => id !== scenario.id))
                      }
                    }}
                  />
                  <div>
                    <Label className="cursor-pointer">{scenario.name}</Label>
                    <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Game Configuration */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Game Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rounds">Rounds per Game</Label>
                <Input
                  id="rounds"
                  type="number"
                  min="1"
                  max="100"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value) || 10)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="gamesPerPair">Games per Matchup</Label>
                <Input
                  id="gamesPerPair"
                  type="number"
                  min="1"
                  max="10"
                  value={gamesPerPair}
                  onChange={(e) => setGamesPerPair(parseInt(e.target.value) || 3)}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Cost Estimate */}
          <Card className="p-6 bg-muted/50">
            <h2 className="text-xl font-semibold mb-4">Estimated Cost</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Minimum</p>
                <p className="text-2xl font-semibold">${estimatedCost.min.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average</p>
                <p className="text-2xl font-semibold">${estimatedCost.avg.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maximum</p>
                <p className="text-2xl font-semibold">${estimatedCost.max.toFixed(2)}</p>
              </div>
            </div>
            {selectedModels.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Based on {(selectedModels.length * (selectedModels.length - 1)) / 2 * gamesPerPair} games × {rounds} rounds × 2 players
              </p>
            )}
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Start Button */}
          <Button 
            onClick={startTournament} 
            disabled={isLoading || selectedModels.length < 2}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Tournament...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Tournament
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {tournaments.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tournaments yet. Create your first tournament!</p>
            </Card>
          ) : (
            tournaments.map(tournament => (
              <Card key={tournament.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{tournament.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tournament.created_at).toLocaleDateString()} • {' '}
                      {tournament.participants[0]?.count || 0} models • {' '}
                      {tournament.games[0]?.count || 0} games
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      tournament.status === 'completed' ? 'bg-green-100 text-green-700' :
                      tournament.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      tournament.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tournament.status}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/tournament/${tournament.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
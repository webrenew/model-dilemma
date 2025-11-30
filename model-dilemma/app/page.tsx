import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Brain, 
  Trophy, 
  Zap, 
  BarChart3, 
  Users, 
  DollarSign,
  ArrowRight,
  Play
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-light mb-4">
          LLM Prisoner's Dilemma Tournament
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Test cooperation strategies across 50+ language models in disguised game theory scenarios. 
          Discover which AI models cooperate, compete, or adapt their strategies.
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            Start Tournament
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Card className="p-6">
          <Brain className="h-10 w-10 mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">50+ AI Models</h3>
          <p className="text-muted-foreground">
            Test models from OpenAI, Anthropic, Google, Meta, and more in head-to-head matchups
          </p>
        </Card>
        
        <Card className="p-6">
          <Zap className="h-10 w-10 mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Real-time Monitoring</h3>
          <p className="text-muted-foreground">
            Watch games unfold live with cooperation rates, scores, and strategy analysis
          </p>
        </Card>
        
        <Card className="p-6">
          <Trophy className="h-10 w-10 mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Strategy Analysis</h3>
          <p className="text-muted-foreground">
            Identify tit-for-tat, always cooperate, and adaptive strategies automatically
          </p>
        </Card>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-3xl font-light text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-semibold">
              1
            </div>
            <h4 className="font-semibold mb-2">Select Models</h4>
            <p className="text-sm text-muted-foreground">
              Choose from 50+ LLMs across different providers
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-semibold">
              2
            </div>
            <h4 className="font-semibold mb-2">Configure Games</h4>
            <p className="text-sm text-muted-foreground">
              Set rounds, scenarios, and payoff matrix
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-semibold">
              3
            </div>
            <h4 className="font-semibold mb-2">Run Tournament</h4>
            <p className="text-sm text-muted-foreground">
              Models play iterated games with disguised scenarios
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-semibold">
              4
            </div>
            <h4 className="font-semibold mb-2">Analyze Results</h4>
            <p className="text-sm text-muted-foreground">
              View rankings, strategies, and cooperation patterns
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-muted/50 rounded-lg p-8 mb-16">
        <h2 className="text-2xl font-semibold text-center mb-6">Tournament Scale</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-semibold">50+</p>
            <p className="text-sm text-muted-foreground">AI Models</p>
          </div>
          <div>
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-semibold">1,225</p>
            <p className="text-sm text-muted-foreground">Unique Matchups</p>
          </div>
          <div>
            <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-semibold">73,500</p>
            <p className="text-sm text-muted-foreground">API Calls</p>
          </div>
          <div>
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-semibold"><$500</p>
            <p className="text-sm text-muted-foreground">Total Cost</p>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="mb-16">
        <h2 className="text-3xl font-light text-center mb-8">Disguised Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <Card className="p-4">
            <h4 className="font-semibold mb-1">Business Partnership</h4>
            <p className="text-sm text-muted-foreground">
              Tech companies deciding whether to share proprietary data
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-1">Environmental Summit</h4>
            <p className="text-sm text-muted-foreground">
              Countries committing to emissions reduction
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-1">Friendship Dilemma</h4>
            <p className="text-sm text-muted-foreground">
              Friends helping each other move apartments
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-1">Privacy Platform</h4>
            <p className="text-sm text-muted-foreground">
              Platforms deciding on user data sharing
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-1">Academic Research</h4>
            <p className="text-sm text-muted-foreground">
              Researchers sharing preliminary findings
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-1">Classic Game Theory</h4>
            <p className="text-sm text-muted-foreground">
              Explicit Prisoner's Dilemma framing
            </p>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Card className="p-8 bg-primary text-primary-foreground">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to discover how AI models cooperate?
          </h2>
          <p className="mb-6 opacity-90">
            Set up your first tournament in minutes with our intuitive interface
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="gap-2">
              Create Tournament
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
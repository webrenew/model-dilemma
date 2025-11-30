import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tournamentWorkflow } from '@/lib/workflows/tournament'
import { createClient } from '@/lib/supabase/server'
import { serve } from 'workflow'

// Schema for starting a tournament
const StartTournamentSchema = z.object({
  models: z.array(z.string()).min(2).max(50),
  scenarios: z.array(z.enum(['explicit', 'business', 'environmental', 'friendship', 'privacy', 'academic'])).optional(),
  roundsPerGame: z.number().min(1).max(100).optional(),
  gamesPerPair: z.number().min(1).max(10).optional()
})

// Schema for workflow webhook
const WorkflowWebhookSchema = z.object({
  workflowId: z.string(),
  runId: z.string(),
  event: z.enum(['started', 'completed', 'failed', 'step']),
  data: z.any()
})

// POST /api/workflow - Start a new tournament
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const input = StartTournamentSchema.parse(body)
    
    // Start the workflow
    const run = await tournamentWorkflow.run({
      models: input.models,
      scenarios: input.scenarios || ['explicit', 'business', 'environmental'],
      roundsPerGame: input.roundsPerGame || 10,
      gamesPerPair: input.gamesPerPair || 3,
      payoffMatrix: {
        both_cooperate: 3,
        both_defect: 1,
        cooperate_vs_defect: {
          cooperator: 0,
          defector: 5
        }
      }
    })

    return NextResponse.json({
      success: true,
      workflowId: tournamentWorkflow.id,
      runId: run.id,
      status: 'started'
    })
  } catch (error) {
    console.error('Failed to start tournament:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start tournament',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/workflow - Get workflow status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const runId = searchParams.get('runId')
  
  if (!runId) {
    return NextResponse.json(
      { success: false, error: 'Missing runId parameter' },
      { status: 400 }
    )
  }

  try {
    // Get workflow run status
    const run = await tournamentWorkflow.runs.get(runId)
    
    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Workflow run not found' },
        { status: 404 }
      )
    }

    // Get additional info from database
    const supabase = createClient()
    let tournament = null
    
    if (run.output?.tournamentId) {
      const { data } = await supabase
        .from('tournament_stats')
        .select('*')
        .eq('tournament_id', run.output.tournamentId)
        .single()
      
      tournament = data
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      currentStep: run.currentStep,
      error: run.error,
      output: run.output,
      tournament
    })
  } catch (error) {
    console.error('Failed to get workflow status:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get workflow status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/workflow - Handle workflow webhooks
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const webhook = WorkflowWebhookSchema.parse(body)
    
    // Update database based on webhook event
    const supabase = createClient()
    
    switch (webhook.event) {
      case 'step':
        // Log workflow step progress
        console.log(`Workflow ${webhook.workflowId} - Step:`, webhook.data)
        break
        
      case 'completed':
        // Update tournament status
        if (webhook.data?.tournamentId) {
          await supabase
            .from('tournaments')
            .update({ status: 'completed' })
            .eq('id', webhook.data.tournamentId)
        }
        break
        
      case 'failed':
        // Update tournament status
        if (webhook.data?.tournamentId) {
          await supabase
            .from('tournaments')
            .update({ status: 'failed' })
            .eq('id', webhook.data.tournamentId)
        }
        break
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle workflow runtime
export const { GET: workflowGet, POST: workflowPost } = serve(tournamentWorkflow)
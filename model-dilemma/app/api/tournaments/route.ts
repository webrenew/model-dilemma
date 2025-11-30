import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/tournaments - List all tournaments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = parseInt(searchParams.get('offset') || '0')
  
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('tournaments')
      .select(`
        *,
        participants(count),
        games(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: tournaments, error, count } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      tournaments,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Failed to fetch tournaments:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tournaments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/tournaments/[id] - Get tournament details
export async function GET_TOURNAMENT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    
    // Get tournament with related data
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        participants(
          *,
          games_participant_1:games!participant_1_id(count),
          games_participant_2:games!participant_2_id(count)
        ),
        games(
          *,
          participant_1:participants!participant_1_id(model_id),
          participant_2:participants!participant_2_id(model_id),
          moves(count)
        )
      `)
      .eq('id', params.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Tournament not found' },
          { status: 404 }
        )
      }
      throw error
    }
    
    // Get aggregated statistics
    const { data: stats } = await supabase
      .from('tournament_stats')
      .select('*')
      .eq('tournament_id', params.id)
      .single()
    
    return NextResponse.json({
      success: true,
      tournament,
      stats
    })
  } catch (error) {
    console.error('Failed to fetch tournament:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tournament details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
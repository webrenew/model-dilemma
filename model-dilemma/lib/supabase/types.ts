export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          name: string
          config: Json
          status: 'pending' | 'active' | 'completed' | 'failed'
          final_rankings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          config?: Json
          status?: 'pending' | 'active' | 'completed' | 'failed'
          final_rankings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          config?: Json
          status?: 'pending' | 'active' | 'completed' | 'failed'
          final_rankings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          tournament_id: string
          model_id: string
          provider: string
          model_config: Json
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          model_id: string
          provider: string
          model_config?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          model_id?: string
          provider?: string
          model_config?: Json
          created_at?: string
        }
      }
      games: {
        Row: {
          id: string
          tournament_id: string
          participant_1_id: string
          participant_2_id: string
          scenario_type: string
          game_number: number
          final_scores: Json | null
          cooperation_rates: Json | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          participant_1_id: string
          participant_2_id: string
          scenario_type: string
          game_number: number
          final_scores?: Json | null
          cooperation_rates?: Json | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          participant_1_id?: string
          participant_2_id?: string
          scenario_type?: string
          game_number?: number
          final_scores?: Json | null
          cooperation_rates?: Json | null
          completed_at?: string | null
          created_at?: string
        }
      }
      moves: {
        Row: {
          id: string
          game_id: string
          participant_id: string
          round_number: number
          action: 'cooperate' | 'defect'
          opponent_action: 'cooperate' | 'defect' | null
          points_earned: number | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          participant_id: string
          round_number: number
          action: 'cooperate' | 'defect'
          opponent_action?: 'cooperate' | 'defect' | null
          points_earned?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          participant_id?: string
          round_number?: number
          action?: 'cooperate' | 'defect'
          opponent_action?: 'cooperate' | 'defect' | null
          points_earned?: number | null
          created_at?: string
        }
      }
      reasoning_logs: {
        Row: {
          id: string
          move_id: string
          raw_response: string
          reasoning_structured: Json
          tokens_used: Json
          latency_ms: number
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          move_id: string
          raw_response: string
          reasoning_structured: Json
          tokens_used?: Json
          latency_ms: number
          cost_usd?: number
          created_at?: string
        }
        Update: {
          id?: string
          move_id?: string
          raw_response?: string
          reasoning_structured?: Json
          tokens_used?: Json
          latency_ms?: number
          cost_usd?: number
          created_at?: string
        }
      }
    }
    Views: {
      tournament_stats: {
        Row: {
          tournament_id: string
          name: string
          status: string
          participant_count: number
          total_games: number
          completed_games: number
          total_cost: number
          avg_cooperation_rate: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tournament config types
export interface TournamentConfig {
  models: string[]
  scenarios: ScenarioType[]
  roundsPerGame: number
  gamesPerPair: number
  payoffMatrix: PayoffMatrix
}

export type ScenarioType = 'explicit' | 'business' | 'environmental' | 'friendship' | 'privacy' | 'academic'

export interface PayoffMatrix {
  both_cooperate: number
  both_defect: number
  cooperate_vs_defect: {
    cooperator: number
    defector: number
  }
}

// Game types
export interface GameState {
  history: RoundHistory[]
  scores: { p1: number; p2: number }
  cooperations: { p1: number; p2: number }
}

export interface RoundHistory {
  round: number
  p1_action: 'cooperate' | 'defect'
  p2_action: 'cooperate' | 'defect'
  p1_points: number
  p2_points: number
}

// AI response types
export interface MoveResponse {
  action: 'cooperate' | 'defect'
  opponent_prediction: 'cooperate' | 'defect'
  confidence: number
  reasoning_steps: string[]
  decision_factors: {
    trust_level: number
    risk_assessment: number
    history_weight: number
  }
}

// Tournament results types
export interface ParticipantRanking {
  participant_id: string
  model_id: string
  total_score: number
  avg_cooperation_rate: number
  games_played: number
  wins: number
  losses: number
  ties: number
}
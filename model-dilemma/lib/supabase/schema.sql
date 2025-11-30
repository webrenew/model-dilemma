-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Core tables
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    final_rankings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    model_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    participant_1_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    participant_2_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    scenario_type VARCHAR(50) NOT NULL,
    game_number INTEGER NOT NULL,
    final_scores JSONB,
    cooperation_rates JSONB,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('cooperate', 'defect')),
    opponent_action VARCHAR(10) CHECK (opponent_action IN ('cooperate', 'defect')),
    points_earned INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reasoning_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    move_id UUID NOT NULL REFERENCES moves(id) ON DELETE CASCADE,
    raw_response TEXT NOT NULL,
    reasoning_structured JSONB NOT NULL,
    tokens_used JSONB NOT NULL DEFAULT '{"input": 0, "output": 0}',
    latency_ms INTEGER NOT NULL,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_reasoning_gin ON reasoning_logs USING GIN (reasoning_structured jsonb_path_ops);
CREATE INDEX idx_moves_analysis ON moves(game_id, participant_id, round_number);
CREATE INDEX idx_games_scenario ON games(tournament_id, scenario_type);
CREATE INDEX idx_games_participants ON games(participant_1_id, participant_2_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_participants_model ON participants(tournament_id, model_id);

-- Real-time setup
ALTER PUBLICATION supabase_realtime ADD TABLE games, moves;

-- Row Level Security (RLS) policies
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (for demo purposes)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow public read access to tournaments" ON tournaments
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to participants" ON participants
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to games" ON games
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to moves" ON moves
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to reasoning_logs" ON reasoning_logs
    FOR SELECT USING (true);

-- Insert policies for authenticated users
CREATE POLICY "Allow authenticated insert to tournaments" ON tournaments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated insert to participants" ON participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated insert to games" ON games
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated insert to moves" ON moves
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated insert to reasoning_logs" ON reasoning_logs
    FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Allow authenticated update to tournaments" ON tournaments
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated update to games" ON games
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated update to moves" ON moves
    FOR UPDATE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for tournaments updated_at
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for tournament statistics
CREATE VIEW tournament_stats AS
SELECT 
    t.id as tournament_id,
    t.name,
    t.status,
    COUNT(DISTINCT p.id) as participant_count,
    COUNT(DISTINCT g.id) as total_games,
    COUNT(DISTINCT CASE WHEN g.completed_at IS NOT NULL THEN g.id END) as completed_games,
    SUM(CASE WHEN rl.cost_usd IS NOT NULL THEN rl.cost_usd ELSE 0 END) as total_cost,
    AVG(CASE WHEN g.cooperation_rates IS NOT NULL 
        THEN (g.cooperation_rates->>'p1')::float + (g.cooperation_rates->>'p2')::float 
        ELSE NULL 
    END) / 2 as avg_cooperation_rate
FROM tournaments t
LEFT JOIN participants p ON p.tournament_id = t.id
LEFT JOIN games g ON g.tournament_id = t.id
LEFT JOIN moves m ON m.game_id = g.id
LEFT JOIN reasoning_logs rl ON rl.move_id = m.id
GROUP BY t.id, t.name, t.status;
import { supabase } from '@/integrations/supabase/client';

export class ScoreService {
  private static instance: ScoreService;
  private currentScore: number = 0;
  private highScore: number = 0;

  private constructor() {}

  static getInstance(): ScoreService {
    if (!ScoreService.instance) {
      ScoreService.instance = new ScoreService();
    }
    return ScoreService.instance;
  }

  addScore(points: number): void {
    this.currentScore += points;
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
    }
  }

  getCurrentScore(): number {
    return this.currentScore;
  }

  getHighScore(): number {
    return this.highScore;
  }

  resetScore(): void {
    this.currentScore = 0;
  }

  formatScore(score: number): string {
    if (score >= 1000000000000) {
      return `${(score / 1000000000000).toFixed(1)}T`;
    } else if (score >= 1000000000) {
      return `${(score / 1000000000).toFixed(1)}B`;
    } else if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    } else if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toString();
  }

  /**
   * Submit current score to the Supabase leaderboard table.
   * Uses int8 (bigint) column to safely handle 1993 hyperinflation-scale values.
   */
  async submitScore(username: string, eraRecorded?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leaderboard')
        .insert({
          username,
          score: this.currentScore,
          era_recorded: eraRecorded ?? null,
        });

      if (error) {
        console.error('Failed to submit score:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Score submission exception:', err);
      return false;
    }
  }

  /**
   * Fetch top N scores from the leaderboard.
   */
  async fetchTopScores(limit: number = 10): Promise<{ username: string; score: number; era_recorded: string | null }[]> {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('username, score, era_recorded')
        .order('score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error('Failed to fetch scores:', err);
      return [];
    }
  }
}

export const scoreService = ScoreService.getInstance();

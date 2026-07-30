import Phaser from 'phaser';
import { supabase } from '@/integrations/supabase/client';
import { scoreService } from '../services/ScoreService';

interface LeaderboardEntry {
  username: string;
  score: number;
  era_recorded: string | null;
}

export class LeaderboardScene extends Phaser.Scene {
  private entries: LeaderboardEntry[] = [];
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);

    // Title
    const title = this.add.text(width / 2, 40, 'LEADERBOARD', {
      fontFamily: 'Press Start 2P',
      fontSize: '24px',
      color: '#cc0000',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true }
    });
    title.setOrigin(0.5);

    // Loading indicator
    this.loadingText = this.add.text(width / 2, height / 2, 'LOADING...', {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: '#fbbf24'
    });
    this.loadingText.setOrigin(0.5);

    this.fetchLeaderboard();

    // Back button
    const backText = this.add.text(width / 2, height - 50, 'PRESS ESC TO RETURN', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#666666'
    });
    backText.setOrigin(0.5);

    this.tweens.add({
      targets: backText,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private async fetchLeaderboard(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('username, score, era_recorded')
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;
      this.entries = data ?? [];
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      this.entries = [];
    }

    this.loadingText.destroy();
    this.renderEntries();
  }

  private renderEntries(): void {
    const { width } = this.cameras.main;
    const startY = 100;

    if (this.entries.length === 0) {
      const empty = this.add.text(width / 2, startY + 80, 'NO ENTRIES YET', {
        fontFamily: 'VT323',
        fontSize: '20px',
        color: '#666666'
      });
      empty.setOrigin(0.5);
      return;
    }

    // Header
    this.add.text(60, startY, 'RANK', { fontFamily: 'Press Start 2P', fontSize: '10px', color: '#888888' });
    this.add.text(160, startY, 'COMRADE', { fontFamily: 'Press Start 2P', fontSize: '10px', color: '#888888' });
    this.add.text(width - 60, startY, 'SCORE', { fontFamily: 'Press Start 2P', fontSize: '10px', color: '#888888' }).setOrigin(1, 0);

    this.entries.forEach((entry, i) => {
      const y = startY + 40 + i * 35;
      const color = i === 0 ? '#fbbf24' : i < 3 ? '#cc0000' : '#cccccc';

      this.add.text(60, y, `${i + 1}.`, { fontFamily: 'Press Start 2P', fontSize: '12px', color });
      this.add.text(160, y, entry.username, { fontFamily: 'VT323', fontSize: '22px', color });
      this.add.text(width - 60, y, scoreService.formatScore(entry.score), {
        fontFamily: 'VT323', fontSize: '22px', color
      }).setOrigin(1, 0);
    });
  }
}

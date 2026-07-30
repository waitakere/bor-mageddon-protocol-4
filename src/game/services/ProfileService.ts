export interface PlayerProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  total_score: number;
  games_played: number;
  created_at: string;
}

export class ProfileService {
  private static instance: ProfileService;
  private currentProfile: PlayerProfile | null = null;

  private constructor() {}

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  getCurrentProfile(): PlayerProfile | null {
    return this.currentProfile;
  }

  setLocalProfile(username: string): void {
    this.currentProfile = {
      id: crypto.randomUUID(),
      username,
      avatar_url: null,
      total_score: 0,
      games_played: 0,
      created_at: new Date().toISOString()
    };
  }

  updateStats(scoreToAdd: number): void {
    if (!this.currentProfile) return;
    this.currentProfile.total_score += scoreToAdd;
    this.currentProfile.games_played += 1;
  }

  getUsername(): string {
    return this.currentProfile?.username ?? 'COMRADE';
  }
}

export const profileService = ProfileService.getInstance();

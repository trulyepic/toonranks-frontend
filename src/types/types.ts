// types.ts
export type UserRole = "ADMIN" | "GENERAL" | "CONTRIBUTOR" | (string & {});
export type AvatarPreset = "blue" | "emerald" | "amber";

export interface AvatarFields {
  avatar_url?: string | null;
  avatar_preset?: AvatarPreset | null;
}

export type SeriesDetailData = {
  id?: number;
  series_id?: number;
  title?: string;
  genre?: string;
  type?: string;
  cover_url?: string;
  approval_status?: string | null;
  submitted_by_id?: number | null;
  synopsis: string;
  series_cover_url: string;
  author?: string;
  artist?: string;
  story_total: number;
  story_count: number;
  characters_total: number;
  characters_count: number;
  worldbuilding_total: number;
  worldbuilding_count: number;
  art_total: number;
  art_count: number;
  drama_or_fight_total: number;
  drama_or_fight_count: number;
  voted_categories?: string[];
  vote_scores?: Record<string, number>;
  vote_counts?: Record<string, number>;
};

// export interface User {
//   username: string;
//   role?: string;
// }

export interface User extends AvatarFields {
  id: number;
  username: string;
  email?: string | null;
  role?: UserRole | null; // allow null
  // Public-profile visibility toggles (default true). Optional so older stored
  // sessions without these fields still type-check.
  public_ratings?: boolean;
  public_posts?: boolean;
}

export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

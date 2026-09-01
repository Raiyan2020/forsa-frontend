/**
 * Homepage payload types returned by the public API endpoints that power the
 * homepage sections. Owned by the home feature; the server fetchers that
 * produce them live in `features/home/services/server.ts`.
 */

export interface BannerImage {
  image: string;
  banner_url?: string;
}

export interface BannerStatistics {
  volunteer_count: number;
  volunteer_team_count: number;
  organization_count: number;
}

export interface BannerData {
  banner_images: BannerImage[];
  statistics: BannerStatistics;
}

export interface SponsorItem {
  id: number;
  sponsor_logo: string;
  org_name: string;
}

export interface OpportunityImage {
  image: string;
}

export interface HomeOpportunity {
  id: number;
  opportunity_images: OpportunityImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  from_age: number;
  to_age?: number;
  format?: string;
  format_display?: { value_en: string; value_ar: string };
  learning_type_display?: { value_en: string; value_ar: string };
  location_en?: string;
  location_ar?: string;
  registered_volunteers_count: number;
  participants_needed: number;
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  opportunity_status?: string;
  due_date: string;
  is_supports_disabled?: boolean;
  is_urgent?: boolean;
  is_relief?: boolean;
}

export interface EventImage {
  image: string;
}

export interface HomeEvent {
  id: number;
  event_images: EventImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  registration_required: boolean;
  registered_volunteers_count: number;
  participants_needed: number;
  event_status?: string;
  due_date: string;
  view_count: number;
  participation_type_display?: { value_en: string; value_ar: string };
  event_type_display?: { value_en: string; value_ar: string };
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  location_en?: string;
  location_ar?: string;
}

export interface UserProfile {
  full_name: string;
  profile_pic: string | null;
}

export interface CommunityPost {
  id: number;
  nickname: string | null;
  idea_text_en: string;
  idea_text_ar: string;
  is_creator: boolean;
  user: UserProfile;
}

// Auto-generated TypeScript types from JetApi schemas
// Do not edit manually - regenerate with: python scripts/generate_types.py --typescript
// Generated at: 2026-05-19T13:09:17.719264

export interface ProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  phone?: string | null;
}

export interface ProfileOut {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  phone?: string | null;
  onboarding_completed?: boolean;
  claimed_at?: string | null;
  created_at: string;
}

export interface ProfileList {
  items: ProfileOut[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface OnboardingRequest {
  city: string;
  date_of_birth: string;
  interest_tags?: string[];
  role_request?: string[];
  organization_name?: string | null;
  tax_id?: string | null;
}

export interface OrgMembershipOut {
  org_id: string;
  role: string;
  is_active: boolean;
}

export interface CurrentUserResponse {
  id: string;
  email?: string | null;
  email_verified: boolean;
  profile: ProfileOut;
  platform_role: string;
  memberships?: OrgMembershipOut[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UserShort {
  id: string;
  email: string;
}

export interface Viewer {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
  refresh_token: string;
  user: UserShort;
}

export interface EventBase {
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  min_age?: number;
  is_free?: boolean;
  status?: string;
}

export interface VenueBase {
  name: string;
  slug: string;
  city: string;
  address: string;
  venue_type: string;
  country?: string;
}

export interface OrganizationBase {
  name: string;
  slug: string;
  description?: string | null;
  contact_email?: string | null;
  website?: string | null;
}

export interface OrganizationCreate {
  name: string;
  slug: string;
  description?: string | null;
  contact_email?: string | null;
  website?: string | null;
}

export interface OrganizationUpdate {
  name?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface VenueCreate {
  name: string;
  slug: string;
  city: string;
  address: string;
  venue_type: string;
  country?: string;
  org_id: string;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  total_capacity?: number | null;
}

export interface VenueUpdate {
  name?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  total_capacity?: number | null;
  is_active?: boolean | null;
}

export interface EventCreate {
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  min_age?: number;
  is_free?: boolean;
  status?: string;
  organizer_org_id: string;
}

export interface EventUpdate {
  name?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  min_age?: number | null;
  is_free?: boolean | null;
  status?: string | null;
}

export interface OrganizationOut {
  name: string;
  slug: string;
  description?: string | null;
  contact_email?: string | null;
  website?: string | null;
  id: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface VenueOut {
  name: string;
  slug: string;
  city: string;
  address: string;
  venue_type: string;
  country?: string;
  id: string;
  org_id: string;
  total_capacity?: number | null;
  photos?: string[];
  is_active: boolean;
}

export interface EventDiscoveryOut {
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  min_age?: number;
  is_free?: boolean;
  status?: string;
  id: string;
  venue_name?: string | null;
  min_price?: number | null;
  occurrence_date?: string | null;
  tags?: string[];
  created_at: string;
}

export interface EventDetailOut {
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  min_age?: number;
  is_free?: boolean;
  status?: string;
  id: string;
  venue_name?: string | null;
  min_price?: number | null;
  occurrence_date?: string | null;
  tags?: string[];
  created_at: string;
  organizer_org_id: string;
  updated_at: string;
}

export interface OrganizationDetail {
  name: string;
  slug: string;
  description?: string | null;
  contact_email?: string | null;
  website?: string | null;
  id: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  venues?: VenueOut[];
}

export interface EventOccurrenceOut {
  id: string;
  occurrence_date: string;
  start_time: string;
  end_time?: string | null;
  status: string;
  sold_count: number;
  total_capacity: number;
}

export interface TagOut {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  is_active: boolean;
}

export interface TagListResponse {
  items: TagOut[];
  total: number;
}

export interface Page {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminMetrics {
  users: number;
  super_admins: number;
  organizations: number;
  organizations_unverified: number;
  venues: number;
  events: number;
  events_published: number;
  occurrences: number;
}

export interface AdminMembershipOut {
  org_id: string;
  org_name?: string | null;
  role: string;
  is_active: boolean;
}

export interface AdminUserOut {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  city?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  onboarding_completed?: boolean;
  platform_role?: string;
  is_ghost?: boolean;
  organization_name?: string | null;
  tax_id?: string | null;
  role_request?: string[];
  verification_status?: string;
  created_at: string;
}

export interface AdminUserDetail {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  city?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  onboarding_completed?: boolean;
  platform_role?: string;
  is_ghost?: boolean;
  organization_name?: string | null;
  tax_id?: string | null;
  role_request?: string[];
  verification_status?: string;
  created_at: string;
  memberships?: AdminMembershipOut[];
  last_login?: string | null;
}

export interface UpdateUserRole {
  platform_role: string;
}

export interface AdminOrganizationOut {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  contact_email?: string | null;
  can_organize: boolean;
  can_own_venues: boolean;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AdminOrgMemberOut {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  role: string;
  is_active: boolean;
}

export interface AdminVenueOut {
  id: string;
  org_id: string;
  org_name?: string | null;
  name: string;
  slug: string;
  city: string;
  venue_type: string;
  visibility: string;
  total_capacity?: number | null;
  is_active: boolean;
}

export interface AdminOrganizationDetail {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  contact_email?: string | null;
  can_organize: boolean;
  can_own_venues: boolean;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  description?: string | null;
  website?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  members?: AdminOrgMemberOut[];
  venues?: AdminVenueOut[];
}

export interface UpdateOrganization {
  is_verified?: boolean | null;
  is_active?: boolean | null;
  can_organize?: boolean | null;
  can_own_venues?: boolean | null;
}

export interface AdminEventOut {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  status: string;
  is_free: boolean;
  organizer_org_id: string;
  organizer_org_name?: string | null;
  occurrence_count?: number;
  event_date?: string | null;
  location_name?: string | null;
  ticket_price?: number | null;
  created_at: string;
}

export interface AdminUpdateEvent {
  name?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  status?: Literal | null;
  is_free?: boolean | null;
  event_date?: string | null;
  location_name?: string | null;
  ticket_price?: number | null;
}

export interface AdminEventCreate {
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_free?: boolean;
  status?: Literal;
  organizer_org_id: string;
  event_date?: string | null;
  location_name?: string | null;
  ticket_price?: number | null;
}

export interface AdminUpdateUser {
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  phone?: string | null;
}

// API Response wrapper types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
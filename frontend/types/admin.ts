export interface PlatformMetrics {
  total_users: number;
  active_users: number;
  suspended_users: number;
  total_organizations: number;
  total_documents: number;
  total_conversations: number;
}

export interface PlatformUserItem {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "superadmin" | string;
  status: "active" | "suspended" | string;
  organization_id: string;
  organization_name: string;
  website_url?: string | null;
  created_at: string;
  documents_count: number;
  conversations_count: number;
  tickets_count: number;
}

export interface PlatformUserListResponse {
  items: PlatformUserItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserStatusUpdateRequest {
  status: "active" | "suspended";
  reason?: string | null;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  target_user_id: string;
  action: string;
  reason?: string | null;
  created_at: string;
}

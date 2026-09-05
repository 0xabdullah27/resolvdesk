export interface OwnerProfile {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  status: "active" | "suspended" | "pending";
  organizationId: string;
  organizationName: string;
  createdAt: string;
}

export interface OrganizationWorkspace {
  id: string;
  displayName: string;
  createdAt: string;
  widgetKey?: string;
}

export interface NavItem {
  title: string;
  href: string;
  iconName: "layout-dashboard" | "file-text" | "message-square" | "sliders";
  badge?: string;
  disabled?: boolean;
}

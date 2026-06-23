export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: 'student' | 'admin';
          full_name: string;
          email: string;
          faculty_id: string | null;
          department_id: string | null;
          level: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          status: 'active' | 'suspended' | 'deleted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'student' | 'admin';
          full_name: string;
          email: string;
          faculty_id?: string | null;
          department_id?: string | null;
          level?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          status?: 'active' | 'suspended' | 'deleted';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      student_profiles: {
        Row: {
          id: string;
          user_id: string;
          bio: string;
          availability: 'available' | 'busy' | 'unavailable';
          preferred_roles: string[];
          portfolio_links: string[];
          visibility: 'public' | 'department_only' | 'private';
          photo_url: string | null;
          completed_projects_count: number;
          active_projects_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['student_profiles']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['student_profiles']['Row']>;
      };
      faculties: {
        Row: { id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['faculties']['Insert']>;
      };
      departments: {
        Row: {
          id: string;
          faculty_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          faculty_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['skills']['Insert']>;
      };
      interests: {
        Row: { id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['interests']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          faculty_id: string | null;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          faculty_id?: string | null;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          category_id: string;
          faculty_id: string;
          department_id: string;
          max_team_size: number;
          deadline: string;
          visibility: 'public' | 'private' | 'department_only';
          tags: string[];
          status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          title: string;
          description: string;
          category_id: string;
          faculty_id: string;
          department_id: string;
          max_team_size: number;
          deadline: string;
          visibility?: 'public' | 'private' | 'department_only';
          tags?: string[];
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      project_required_skills: {
        Row: { project_id: string; skill_id: string };
        Insert: { project_id: string; skill_id: string };
        Update: Partial<Database['public']['Tables']['project_required_skills']['Insert']>;
      };
      project_optional_skills: {
        Row: { project_id: string; skill_id: string };
        Insert: { project_id: string; skill_id: string };
        Update: Partial<Database['public']['Tables']['project_optional_skills']['Insert']>;
      };
      project_bookmarks: {
        Row: { project_id: string; user_id: string; created_at: string };
        Insert: { project_id: string; user_id: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['project_bookmarks']['Insert']>;
      };
      memberships: {
        Row: {
          id: string;
          project_id: string;
          student_id: string;
          role_name: string;
          status: 'active' | 'left' | 'removed';
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          student_id: string;
          role_name?: string;
          status?: 'active' | 'left' | 'removed';
          joined_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      update_student_profile: {
        Args: {
          p_bio?: string;
          p_availability?: 'available' | 'busy' | 'unavailable';
          p_skill_ids?: string[];
          p_interest_ids?: string[];
          p_preferred_roles?: string[];
          p_portfolio_links?: string[];
          p_visibility?: 'public' | 'department_only' | 'private';
          p_photo_url?: string | null;
        };
        Returns: Database['public']['Tables']['student_profiles']['Row'];
      };
      create_project_with_skills: {
        Args: {
          p_title: string;
          p_description: string;
          p_category_id: string;
          p_department_id: string;
          p_faculty_id: string;
          p_required_skill_ids: string[];
          p_optional_skill_ids: string[];
          p_max_team_size: number;
          p_deadline: string;
          p_visibility: 'public' | 'private' | 'department_only';
          p_tags: string[];
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

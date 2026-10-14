export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      policies: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      repo_embeddings: {
        Row: {
          id: string;
          user_id: string;
          owner: string;
          repo: string;
          file_path: string;
          content: string;
          file_sha: string;
          embedding: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          owner: string;
          repo: string;
          file_path: string;
          content: string;
          file_sha: string;
          embedding: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          owner?: string;
          repo?: string;
          file_path?: string;
          content?: string;
          file_sha?: string;
          embedding?: number[];
          created_at?: string;
        };
        Relationships: [];
      };
      scans: {
        Row: {
          id: string;
          project_name: string;
          file_type: string;
          status: string;
          source_code: string;
          user_id: string;
          health_score: number;
          vulnerabilities_count: {
            critical: number;
            high: number;
            medium: number;
            low: number;
          };
          created_at: string;
        };
        Insert: {
          id?: string;
          project_name: string;
          file_type: string;
          status: string;
          source_code: string;
          user_id: string;
          health_score?: number;
          vulnerabilities_count?: {
            critical: number;
            high: number;
            medium: number;
            low: number;
          };
          created_at?: string;
        };
        Update: {
          id?: string;
          project_name?: string;
          file_type?: string;
          status?: string;
          source_code?: string;
          user_id?: string;
          health_score?: number;
          vulnerabilities_count?: {
            critical: number;
            high: number;
            medium: number;
            low: number;
          };
          created_at?: string;
        };
        Relationships: [];
      };
      usage_quotas: {
        Row: {
          user_id: string;
          audit_credits_remaining: number;
          tier: "free" | "starter" | "pro";
          billing_period_start: string;
          current_period_audits_used: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          audit_credits_remaining?: number;
          tier?: "free" | "starter" | "pro";
          billing_period_start?: string;
          current_period_audits_used?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          audit_credits_remaining?: number;
          tier?: "free" | "starter" | "pro";
          billing_period_start?: string;
          current_period_audits_used?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      paddle_subscriptions: {
        Row: {
          paddle_subscription_id: string;
          user_id: string;
          paddle_customer_id: string | null;
          paddle_price_id: string;
          tier: "starter" | "pro";
          status: string;
          current_period_start: string | null;
          last_event_at: string;
          updated_at: string;
        };
        Insert: {
          paddle_subscription_id: string;
          user_id: string;
          paddle_customer_id?: string | null;
          paddle_price_id: string;
          tier: "starter" | "pro";
          status: string;
          current_period_start?: string | null;
          last_event_at: string;
          updated_at?: string;
        };
        Update: {
          paddle_subscription_id?: string;
          user_id?: string;
          paddle_customer_id?: string | null;
          paddle_price_id?: string;
          tier?: "starter" | "pro";
          status?: string;
          current_period_start?: string | null;
          last_event_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          event_id: string;
          processed_at: string;
        };
        Insert: {
          event_id: string;
          processed_at?: string;
        };
        Update: {
          event_id?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vault_secrets: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          label: string;
          encrypted_token: string;
          iv: string;
          auth_tag: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          label?: string;
          encrypted_token: string;
          iv: string;
          auth_tag: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          label?: string;
          encrypted_token?: string;
          iv?: string;
          auth_tag?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vulnerabilities: {
        Row: {
          id: string;
          scan_id: string;
          title: string;
          description: string | null;
          severity: "critical" | "high" | "medium" | "low";
          cwe_id: string | null;
          vulnerable_code_block: string;
          fixed_code_block: string;
          remediation_steps: string;
          file_path: string | null;
          line_start: number | null;
          line_end: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          title: string;
          description?: string | null;
          severity?: "critical" | "high" | "medium" | "low";
          cwe_id?: string | null;
          vulnerable_code_block?: string;
          fixed_code_block?: string;
          remediation_steps?: string;
          file_path?: string | null;
          line_start?: number | null;
          line_end?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          scan_id?: string;
          title?: string;
          description?: string | null;
          severity?: "critical" | "high" | "medium" | "low";
          cwe_id?: string | null;
          vulnerable_code_block?: string;
          fixed_code_block?: string;
          remediation_steps?: string;
          file_path?: string | null;
          line_start?: number | null;
          line_end?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_audit_usage: {
        Args: { p_user_id: string };
        Returns: { success: boolean; remaining: number };
      };
      get_audit_quota: {
        Args: { p_user_id: string };
        Returns: { tier: "free" | "starter" | "pro"; remaining: number };
      };
      apply_paddle_subscription_event: {
        Args: {
          p_event_id: string;
          p_event_type: string;
          p_user_id: string | null;
          p_subscription_id: string;
          p_customer_id: string | null;
          p_price_id: string | null;
          p_tier: "starter" | "pro" | null;
          p_status: string;
          p_period_start: string | null;
          p_occurred_at: string;
        };
        Returns: boolean;
      };
      search_repo_context: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          repo_owner: string;
          repo_name: string;
          match_user_id?: string;
        };
        Returns: {
          file_path: string;
          content: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

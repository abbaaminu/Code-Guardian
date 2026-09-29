export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      policies: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          enabled?: boolean
          created_at?: string
        }
        Relationships: []
      }
      repo_embeddings: {
        Row: {
          id: string
          user_id: string
          repo: string
          owner: string
          file_path: string
          file_sha: string
          content: string
          embedding: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo: string
          owner: string
          file_path: string
          file_sha: string
          content: string
          embedding?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo?: string
          owner?: string
          file_path?: string
          file_sha?: string
          content?: string
          embedding?: string | null
          created_at?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          id: string
          project_name: string
          file_type: string
          health_score: number
          created_at: string
        }
        Insert: {
          id?: string
          project_name: string
          file_type: string
          health_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_name?: string
          file_type?: string
          health_score?: number
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      vault_secrets: {
        Row: {
          id: string
          user_id: string
          name: string
          secret: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          secret: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          secret?: string
          created_at?: string
        }
        Relationships: []
      }
      vulnerabilities: {
        Row: {
          id: string
          scan_id: string
          title: string
          description: string | null
          severity: string
          vulnerable_code_block: string
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          title: string
          description?: string | null
          severity?: string
          vulnerable_code_block?: string
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          title?: string
          description?: string | null
          severity?: string
          vulnerable_code_block?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_scan_id_fkey"
            columns: ["scan_id"]
            isAligned: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_repo_context: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          filter_user_id: string
        }
        Returns: {
          file_path: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
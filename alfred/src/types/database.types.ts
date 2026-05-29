export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  alfred: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string | null
          plan: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          owner_id?: string | null
          plan?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string | null
          plan?: string | null
          created_at?: string | null
        }
      }
      businesses: {
        Row: {
          id: string
          workspace_id: string
          name: string
          nit: string | null
          tax_regime: string | null
          currency: string
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          nit?: string | null
          tax_regime?: string | null
          currency?: string
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          nit?: string | null
          tax_regime?: string | null
          currency?: string
          is_active?: boolean
          created_at?: string | null
        }
      }
      social_accounts: {
        Row: {
          id: string
          workspace_id: string | null
          network: string
          account_id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          is_active: boolean | null
          connected_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          network: string
          account_id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          is_active?: boolean | null
          connected_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          network?: string
          account_id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          is_active?: boolean | null
          connected_at?: string | null
        }
      }
      workspace_goals: {
        Row: {
          id: string
          workspace_id: string | null
          network: string | null
          metric: string
          current_value: number | null
          target_value: number
          deadline: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          network?: string | null
          metric: string
          current_value?: number | null
          target_value: number
          deadline?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          network?: string | null
          metric?: string
          current_value?: number | null
          target_value?: number
          deadline?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      agent_conversations: {
        Row: {
          id: string
          workspace_id: string | null
          role: string
          content: string
          tool_calls: Json | null
          agent_mode: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          role: string
          content: string
          tool_calls?: Json | null
          agent_mode?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          role?: string
          content?: string
          tool_calls?: Json | null
          agent_mode?: string | null
          created_at?: string | null
        }
      }
      daily_tasks: {
        Row: {
          id: string
          workspace_id: string | null
          date: string
          type: string
          title: string
          description: string | null
          network: string | null
          priority: number | null
          status: string | null
          agent_generated: boolean | null
          goal_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          date?: string
          type: string
          title: string
          description?: string | null
          network?: string | null
          priority?: number | null
          status?: string | null
          agent_generated?: boolean | null
          goal_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          date?: string
          type?: string
          title?: string
          description?: string | null
          network?: string | null
          priority?: number | null
          status?: string | null
          agent_generated?: boolean | null
          goal_id?: string | null
          created_at?: string | null
        }
      }
      content_posts: {
        Row: {
          id: string
          workspace_id: string | null
          caption: string | null
          media_urls: string[] | null
          media_type: string | null
          scheduled_at: string | null
          networks: string[]
          status: string | null
          published_at: string | null
          external_ids: Json | null
          metrics_snapshot: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          caption?: string | null
          media_urls?: string[] | null
          media_type?: string | null
          scheduled_at?: string | null
          networks: string[]
          status?: string | null
          published_at?: string | null
          external_ids?: Json | null
          metrics_snapshot?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          caption?: string | null
          media_urls?: string[] | null
          media_type?: string | null
          scheduled_at?: string | null
          networks?: string[]
          status?: string | null
          published_at?: string | null
          external_ids?: Json | null
          metrics_snapshot?: Json | null
          created_at?: string | null
        }
      }
      analytics_snapshots: {
        Row: {
          id: string
          workspace_id: string | null
          network: string
          metric_name: string
          value: number
          period_start: string | null
          period_end: string | null
          recorded_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          network: string
          metric_name: string
          value: number
          period_start?: string | null
          period_end?: string | null
          recorded_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          network?: string
          metric_name?: string
          value?: number
          period_start?: string | null
          period_end?: string | null
          recorded_at?: string | null
        }
      }
      notification_channels: {
        Row: {
          id: string
          workspace_id: string
          type: string
          target: string
          label: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          type: string
          target: string
          label: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          type?: string
          target?: string
          label?: string
          is_active?: boolean
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          workspace_id: string | null
          action: string
          resource: string | null
          result: string
          ip: string | null
          user_agent: string | null
          request_id: string | null
          details: Json | null
          level: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          workspace_id?: string | null
          action: string
          resource?: string | null
          result: string
          ip?: string | null
          user_agent?: string | null
          request_id?: string | null
          details?: Json | null
          level: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          workspace_id?: string | null
          action?: string
          resource?: string | null
          result?: string
          ip?: string | null
          user_agent?: string | null
          request_id?: string | null
          details?: Json | null
          level?: string
          created_at?: string | null
        }
      }
      tax_obligations: {
        Row: {
          id: string
          workspace_id: string
          business_id: string | null
          tax_type: string
          period: string
          due_date: string
          status: string
          filed_at: string | null
          filed_amount: number | null
          reminder_sent_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          business_id?: string | null
          tax_type: string
          period: string
          due_date: string
          status?: string
          filed_at?: string | null
          filed_amount?: number | null
          reminder_sent_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          business_id?: string | null
          tax_type?: string
          period?: string
          due_date?: string
          status?: string
          filed_at?: string | null
          filed_amount?: number | null
          reminder_sent_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      notes: {
        Row: {
          id: string
          workspace_id: string
          business_id: string | null
          title: string | null
          body: string | null
          pinned: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          business_id?: string | null
          title?: string | null
          body?: string | null
          pinned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          business_id?: string | null
          title?: string | null
          body?: string | null
          pinned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      todos: {
        Row: {
          id: string
          workspace_id: string
          business_id: string | null
          title: string
          notes: string | null
          due_date: string | null
          priority: number | null
          status: string
          source: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          business_id?: string | null
          title: string
          notes?: string | null
          due_date?: string | null
          priority?: number | null
          status?: string
          source?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          business_id?: string | null
          title?: string
          notes?: string | null
          due_date?: string | null
          priority?: number | null
          status?: string
          source?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agent_context: {
        Args: { p_workspace_id: string }
        Returns: Json
      }
      // Note: actual function is alfred.get_agent_context — call via rpc with schema routing
    }
    Enums: {
      [_ in never]: never
    }
  }
}

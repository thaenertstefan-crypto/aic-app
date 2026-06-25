// Generiert aus dem Supabase-Projekt aic-app (ixyniuiiudcdohrlohan).
// NICHT manuell editieren. Neu generieren bei Schema-Änderungen via
// Supabase MCP generate_typescript_types bzw.
// `supabase gen types typescript --project-id ixyniuiiudcdohrlohan`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_of_rights: {
        Row: {
          created_at: string | null
          id: string
          rights: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rights?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rights?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_rights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanser_checkins: {
        Row: {
          cleanser_slug: string
          created_at: string | null
          date: string
          id: string
          user_id: string
        }
        Insert: {
          cleanser_slug: string
          created_at?: string | null
          date?: string
          id?: string
          user_id: string
        }
        Update: {
          cleanser_slug?: string
          created_at?: string | null
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanser_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanser_intro_seen: {
        Row: {
          cleanser_slug: string
          seen_at: string
          user_id: string
        }
        Insert: {
          cleanser_slug: string
          seen_at?: string
          user_id: string
        }
        Update: {
          cleanser_slug?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          active_recipe_slug: string | null
          date: string | null
          id: string
          mood_score: number | null
          notes: string | null
          user_id: string | null
        }
        Insert: {
          active_recipe_slug?: string | null
          date?: string | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          active_recipe_slug?: string | null
          date?: string | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          ai_insights: string | null
          content: Json
          created_at: string | null
          entry_date: string | null
          id: string
          recipe_slug: string | null
          template_type: string
          user_id: string | null
        }
        Insert: {
          ai_insights?: string | null
          content: Json
          created_at?: string | null
          entry_date?: string | null
          id?: string
          recipe_slug?: string | null
          template_type: string
          user_id?: string | null
        }
        Update: {
          ai_insights?: string | null
          content?: Json
          created_at?: string | null
          entry_date?: string | null
          id?: string
          recipe_slug?: string | null
          template_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mantra_cards: {
        Row: {
          created_at: string | null
          id: string
          reframe: string
          sort_order: number
          thought: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reframe: string
          sort_order?: number
          thought: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reframe?: string
          sort_order?: number
          thought?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_recipe_id: string | null
          confidence_baseline: number | null
          created_at: string | null
          id: string
          name: string | null
          onboarding_completed: boolean | null
        }
        Insert: {
          active_recipe_id?: string | null
          confidence_baseline?: number | null
          created_at?: string | null
          id: string
          name?: string | null
          onboarding_completed?: boolean | null
        }
        Update: {
          active_recipe_id?: string | null
          confidence_baseline?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          onboarding_completed?: boolean | null
        }
        Relationships: []
      }
      promise_completions: {
        Row: {
          completed_date: string | null
          id: string
          promise_id: string | null
        }
        Insert: {
          completed_date?: string | null
          id?: string
          promise_id?: string | null
        }
        Update: {
          completed_date?: string | null
          id?: string
          promise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promise_completions_promise_id_fkey"
            columns: ["promise_id"]
            isOneToOne: false
            referencedRelation: "promises"
            referencedColumns: ["id"]
          },
        ]
      }
      promises: {
        Row: {
          active: boolean | null
          created_at: string | null
          current_streak: number | null
          description: string
          id: string
          last_completed: string | null
          longest_streak: number | null
          start_date: string | null
          target_days: number | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          current_streak?: number | null
          description: string
          id?: string
          last_completed?: string | null
          longest_streak?: number | null
          start_date?: string | null
          target_days?: number | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          current_streak?: number | null
          description?: string
          id?: string
          last_completed?: string | null
          longest_streak?: number | null
          start_date?: string | null
          target_days?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mantra: {
        Row: {
          id: string
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_recipe_progress: {
        Row: {
          completed_at: string | null
          current_step: number | null
          cycle_number: number | null
          id: string
          intro_seen: boolean
          recipe_slug: string
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          cycle_number?: number | null
          id?: string
          intro_seen?: boolean
          recipe_slug: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          cycle_number?: number | null
          id?: string
          intro_seen?: boolean
          recipe_slug?: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_recipe_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      values_hypothesis: {
        Row: {
          confirmed: boolean | null
          created_at: string | null
          id: string
          user_id: string | null
          values: Json
          version: number | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          values: Json
          version?: number | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          values?: Json
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "values_hypothesis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

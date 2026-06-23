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
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          idea: string
          name: string
          structure: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          idea: string
          name: string
          structure?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          idea?: string
          name?: string
          structure?: string
        }
        Relationships: []
      }
      discovery_leads: {
        Row: {
          bottleneck: string | null
          company: string | null
          created_at: string
          email: string
          engagement_preference: string | null
          id: string
          name: string
        }
        Insert: {
          bottleneck?: string | null
          company?: string | null
          created_at?: string
          email: string
          engagement_preference?: string | null
          id?: string
          name: string
        }
        Update: {
          bottleneck?: string | null
          company?: string | null
          created_at?: string
          email?: string
          engagement_preference?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      feature_candidates: {
        Row: {
          cluster_id: string | null
          confidence: number | null
          created_at: string | null
          effort: string | null
          evidence: Json | null
          id: string
          pain_score: number | null
          problem: string
          product_tag: string | null
          proposed_solution: string
          representative_quotes: Json | null
          status: string | null
          theme_id: string | null
        }
        Insert: {
          cluster_id?: string | null
          confidence?: number | null
          created_at?: string | null
          effort?: string | null
          evidence?: Json | null
          id?: string
          pain_score?: number | null
          problem: string
          product_tag?: string | null
          proposed_solution: string
          representative_quotes?: Json | null
          status?: string | null
          theme_id?: string | null
        }
        Update: {
          cluster_id?: string | null
          confidence?: number | null
          created_at?: string | null
          effort?: string | null
          evidence?: Json | null
          id?: string
          pain_score?: number | null
          problem?: string
          product_tag?: string | null
          proposed_solution?: string
          representative_quotes?: Json | null
          status?: string | null
          theme_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_candidates_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "signal_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_candidates_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "signal_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_perspectives: {
        Row: {
          challenge_questions: Json | null
          created_at: string | null
          id: string
          persona: string
          perspective: string
          report_id: string | null
          user_responses: Json | null
        }
        Insert: {
          challenge_questions?: Json | null
          created_at?: string | null
          id?: string
          persona: string
          perspective: string
          report_id?: string | null
          user_responses?: Json | null
        }
        Update: {
          challenge_questions?: Json | null
          created_at?: string | null
          id?: string
          persona?: string
          perspective?: string
          report_id?: string | null
          user_responses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_perspectives_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "idea_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_reports: {
        Row: {
          alt_prompts: Json | null
          annotations: Json | null
          brief: Json
          concept_image_url: string | null
          created_at: string
          expanded_ideas: Json | null
          forked_context: Json | null
          highlights: string[] | null
          id: string
          idea: string
          imported_from_project_id: string | null
          logo_image_url: string | null
          lovable_prompt: string | null
          parent_idea_id: string | null
          prompt_versions: Json | null
          rounds: Json
          status: string | null
          thesis_statement: string | null
          thunderdome_unlocked: boolean | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          alt_prompts?: Json | null
          annotations?: Json | null
          brief: Json
          concept_image_url?: string | null
          created_at?: string
          expanded_ideas?: Json | null
          forked_context?: Json | null
          highlights?: string[] | null
          id?: string
          idea: string
          imported_from_project_id?: string | null
          logo_image_url?: string | null
          lovable_prompt?: string | null
          parent_idea_id?: string | null
          prompt_versions?: Json | null
          rounds?: Json
          status?: string | null
          thesis_statement?: string | null
          thunderdome_unlocked?: boolean | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          alt_prompts?: Json | null
          annotations?: Json | null
          brief?: Json
          concept_image_url?: string | null
          created_at?: string
          expanded_ideas?: Json | null
          forked_context?: Json | null
          highlights?: string[] | null
          id?: string
          idea?: string
          imported_from_project_id?: string | null
          logo_image_url?: string | null
          lovable_prompt?: string | null
          parent_idea_id?: string | null
          prompt_versions?: Json | null
          rounds?: Json
          status?: string | null
          thesis_statement?: string | null
          thunderdome_unlocked?: boolean | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_reports_imported_from_project_id_fkey"
            columns: ["imported_from_project_id"]
            isOneToOne: false
            referencedRelation: "project_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_reports_parent_idea_id_fkey"
            columns: ["parent_idea_id"]
            isOneToOne: false
            referencedRelation: "idea_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_stack_items: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          label: string
          pinned: boolean
          position: number
          report_id: string
          source: string | null
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind: string
          label: string
          pinned?: boolean
          position?: number
          report_id: string
          source?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          label?: string
          pinned?: boolean
          position?: number
          report_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_stack_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "idea_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      project_registry: {
        Row: {
          category: Database["public"]["Enums"]["project_category"]
          created_at: string
          description: string | null
          id: string
          last_touched: string
          lovable_project_id: string | null
          manifest_cache: Json | null
          manifest_cached_at: string | null
          name: string
          notes: string | null
          parent_brand: string | null
          priority: number
          report_id: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["project_category"]
          created_at?: string
          description?: string | null
          id?: string
          last_touched?: string
          lovable_project_id?: string | null
          manifest_cache?: Json | null
          manifest_cached_at?: string | null
          name: string
          notes?: string | null
          parent_brand?: string | null
          priority?: number
          report_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["project_category"]
          created_at?: string
          description?: string | null
          id?: string
          last_touched?: string
          lovable_project_id?: string | null
          manifest_cache?: Json | null
          manifest_cached_at?: string | null
          name?: string
          notes?: string | null
          parent_brand?: string | null
          priority?: number
          report_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_registry_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "idea_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_clusters: {
        Row: {
          created_at: string | null
          id: string
          member_count: number | null
          pain_score: number | null
          product_tag: string | null
          theme: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_count?: number | null
          pain_score?: number | null
          product_tag?: string | null
          theme: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_count?: number | null
          pain_score?: number | null
          product_tag?: string | null
          theme?: string
        }
        Relationships: []
      }
      signal_raw: {
        Row: {
          author_hash: string | null
          body: string
          cluster_id: string | null
          collected_at: string | null
          embedding: string | null
          id: string
          label: string | null
          label_confidence: number | null
          processed: boolean | null
          product_tag: string | null
          raw: Json | null
          source: string
          source_url: string | null
          title: string | null
        }
        Insert: {
          author_hash?: string | null
          body: string
          cluster_id?: string | null
          collected_at?: string | null
          embedding?: string | null
          id?: string
          label?: string | null
          label_confidence?: number | null
          processed?: boolean | null
          product_tag?: string | null
          raw?: Json | null
          source: string
          source_url?: string | null
          title?: string | null
        }
        Update: {
          author_hash?: string | null
          body?: string
          cluster_id?: string | null
          collected_at?: string | null
          embedding?: string | null
          id?: string
          label?: string | null
          label_confidence?: number | null
          processed?: boolean | null
          product_tag?: string | null
          raw?: Json | null
          source?: string
          source_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      signal_themes: {
        Row: {
          candidate_count: number | null
          embedding: string | null
          first_seen: string | null
          id: string
          last_seen: string | null
          occurrence_count: number | null
          pain_score: number | null
          product_tag: string | null
          sample_quotes: Json | null
          score_history: Json | null
          status: string | null
          title: string
        }
        Insert: {
          candidate_count?: number | null
          embedding?: string | null
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          occurrence_count?: number | null
          pain_score?: number | null
          product_tag?: string | null
          sample_quotes?: Json | null
          score_history?: Json | null
          status?: string | null
          title: string
        }
        Update: {
          candidate_count?: number | null
          embedding?: string | null
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          occurrence_count?: number | null
          pain_score?: number | null
          product_tag?: string | null
          sample_quotes?: Json | null
          score_history?: Json | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      simulator_captures: {
        Row: {
          concept_image_url: string | null
          created_at: string
          email: string
          id: string
          idea: string
          landing_page_html: string | null
          logo_image_url: string | null
          lovable_prompt: string | null
          report_id: string | null
          rounds: Json
          user_id: string | null
        }
        Insert: {
          concept_image_url?: string | null
          created_at?: string
          email: string
          id?: string
          idea: string
          landing_page_html?: string | null
          logo_image_url?: string | null
          lovable_prompt?: string | null
          report_id?: string | null
          rounds?: Json
          user_id?: string | null
        }
        Update: {
          concept_image_url?: string | null
          created_at?: string
          email?: string
          id?: string
          idea?: string
          landing_page_html?: string | null
          logo_image_url?: string | null
          lovable_prompt?: string | null
          report_id?: string | null
          rounds?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulator_captures_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "idea_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_signal_raw: {
        Args: {
          filter_product?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          body: string
          id: string
          similarity: number
          source: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      project_category:
        | "partner"
        | "internal_dev"
        | "future_dev"
        | "fun"
        | "client"
        | "experiment"
      project_status: "active" | "paused" | "shipped" | "archived"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      project_category: [
        "partner",
        "internal_dev",
        "future_dev",
        "fun",
        "client",
        "experiment",
      ],
      project_status: ["active", "paused", "shipped", "archived"],
    },
  },
} as const

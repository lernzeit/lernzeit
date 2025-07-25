export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements_template: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"]
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_value: number
          reward_minutes: number
          type: Database["public"]["Enums"]["achievement_type"]
        }
        Insert: {
          category: Database["public"]["Enums"]["achievement_category"]
          color?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          requirement_value: number
          reward_minutes?: number
          type: Database["public"]["Enums"]["achievement_type"]
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"]
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_value?: number
          reward_minutes?: number
          type?: Database["public"]["Enums"]["achievement_type"]
        }
        Relationships: []
      }
      child_settings: {
        Row: {
          biology_seconds_per_task: number
          chemistry_seconds_per_task: number
          child_id: string
          created_at: string
          english_seconds_per_task: number
          geography_seconds_per_task: number
          german_seconds_per_task: number
          history_seconds_per_task: number
          id: string
          latin_seconds_per_task: number
          math_seconds_per_task: number
          parent_id: string
          physics_seconds_per_task: number
          updated_at: string
          weekday_max_minutes: number
          weekend_max_minutes: number
        }
        Insert: {
          biology_seconds_per_task?: number
          chemistry_seconds_per_task?: number
          child_id: string
          created_at?: string
          english_seconds_per_task?: number
          geography_seconds_per_task?: number
          german_seconds_per_task?: number
          history_seconds_per_task?: number
          id?: string
          latin_seconds_per_task?: number
          math_seconds_per_task?: number
          parent_id: string
          physics_seconds_per_task?: number
          updated_at?: string
          weekday_max_minutes?: number
          weekend_max_minutes?: number
        }
        Update: {
          biology_seconds_per_task?: number
          chemistry_seconds_per_task?: number
          child_id?: string
          created_at?: string
          english_seconds_per_task?: number
          geography_seconds_per_task?: number
          german_seconds_per_task?: number
          history_seconds_per_task?: number
          id?: string
          latin_seconds_per_task?: number
          math_seconds_per_task?: number
          parent_id?: string
          physics_seconds_per_task?: number
          updated_at?: string
          weekday_max_minutes?: number
          weekend_max_minutes?: number
        }
        Relationships: []
      }
      child_subject_visibility: {
        Row: {
          child_id: string
          created_at: string
          id: string
          is_visible: boolean
          parent_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          parent_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          parent_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          category: string | null
          correct_answers: number
          created_at: string | null
          duration_seconds: number | null
          grade: number
          id: string
          question_source: string | null
          score: number | null
          session_date: string | null
          time_earned: number
          time_spent: number
          total_questions: number
          user_id: string | null
        }
        Insert: {
          category?: string | null
          correct_answers?: number
          created_at?: string | null
          duration_seconds?: number | null
          grade: number
          id?: string
          question_source?: string | null
          score?: number | null
          session_date?: string | null
          time_earned?: number
          time_spent?: number
          total_questions?: number
          user_id?: string | null
        }
        Update: {
          category?: string | null
          correct_answers?: number
          created_at?: string | null
          duration_seconds?: number | null
          grade?: number
          id?: string
          question_source?: string | null
          score?: number | null
          session_date?: string | null
          time_earned?: number
          time_spent?: number
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_templates: {
        Row: {
          category: string
          content: string
          content_hash: string
          created_at: string
          grade: number
          id: string
          is_active: boolean
          quality_score: number
          question_type: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category: string
          content: string
          content_hash: string
          created_at?: string
          grade: number
          id?: string
          is_active?: boolean
          quality_score?: number
          question_type?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string
          content?: string
          content_hash?: string
          created_at?: string
          grade?: number
          id?: string
          is_active?: boolean
          quality_score?: number
          question_type?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      generation_sessions: {
        Row: {
          average_quality_score: number
          category: string
          created_at: string
          grade: number
          id: string
          request_count: number
          session_id: string
          templates_generated: number
          total_duration_ms: number
          updated_at: string
        }
        Insert: {
          average_quality_score?: number
          category: string
          created_at?: string
          grade: number
          id?: string
          request_count?: number
          session_id: string
          templates_generated?: number
          total_duration_ms?: number
          updated_at?: string
        }
        Update: {
          average_quality_score?: number
          category?: string
          created_at?: string
          grade?: number
          id?: string
          request_count?: number
          session_id?: string
          templates_generated?: number
          total_duration_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      invitation_codes: {
        Row: {
          child_id: string | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          parent_id: string
          used_at: string | null
        }
        Insert: {
          child_id?: string | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          parent_id: string
          used_at?: string | null
        }
        Update: {
          child_id?: string | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          parent_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_codes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_sessions: {
        Row: {
          category: string
          correct_answers: number
          created_at: string
          grade: number
          id: string
          session_date: string
          time_earned: number
          time_spent: number
          total_questions: number
          user_id: string
        }
        Insert: {
          category: string
          correct_answers?: number
          created_at?: string
          grade: number
          id?: string
          session_date?: string
          time_earned?: number
          time_spent?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          category?: string
          correct_answers?: number
          created_at?: string
          grade?: number
          id?: string
          session_date?: string
          time_earned?: number
          time_spent?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      parent_child_relationships: {
        Row: {
          child_id: string | null
          created_at: string | null
          id: string
          parent_id: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_relationships_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_relationships_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          grade: number | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          grade?: number | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          grade?: number | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      question_feedback: {
        Row: {
          category: string
          created_at: string
          feedback_details: string | null
          feedback_type: string
          grade: number
          id: string
          question_content: string
          question_type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          feedback_details?: string | null
          feedback_type: string
          grade: number
          id?: string
          question_content: string
          question_type: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          feedback_details?: string | null
          feedback_type?: string
          grade?: number
          id?: string
          question_content?: string
          question_type?: string
          user_id?: string
        }
        Relationships: []
      }
      template_metrics: {
        Row: {
          created_at: string
          curriculum_alignment: number
          difficulty_appropriateness: number
          evaluation_timestamp: string
          id: string
          overall_score: number
          request_id: string | null
          template_id: string
          uniqueness_score: number
        }
        Insert: {
          created_at?: string
          curriculum_alignment?: number
          difficulty_appropriateness?: number
          evaluation_timestamp?: string
          id?: string
          overall_score?: number
          request_id?: string | null
          template_id: string
          uniqueness_score?: number
        }
        Update: {
          created_at?: string
          curriculum_alignment?: number
          difficulty_appropriateness?: number
          evaluation_timestamp?: string
          id?: string
          overall_score?: number
          request_id?: string | null
          template_id?: string
          uniqueness_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_metrics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "generated_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          current_progress: number
          earned_at: string
          id: string
          is_completed: boolean
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          current_progress?: number
          earned_at?: string
          id?: string
          is_completed?: boolean
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          current_progress?: number
          earned_at?: string
          id?: string
          is_completed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements_template"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invitation_code: {
        Args: { code_to_claim: string; claiming_child_id: string }
        Returns: Json
      }
      cleanup_expired_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_invitation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      trigger_grade_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      trigger_template_generation: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_achievement_progress: {
        Args: {
          p_user_id: string
          p_category: string
          p_type: string
          p_increment?: number
        }
        Returns: Json
      }
    }
    Enums: {
      achievement_category:
        | "math"
        | "german"
        | "english"
        | "geography"
        | "history"
        | "physics"
        | "biology"
        | "chemistry"
        | "latin"
        | "general"
      achievement_type:
        | "questions_solved"
        | "time_earned"
        | "streak"
        | "accuracy"
        | "speed"
        | "milestone"
        | "perfect_sessions"
        | "total_questions"
        | "fast_sessions"
        | "subjects_mastered"
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
      achievement_category: [
        "math",
        "german",
        "english",
        "geography",
        "history",
        "physics",
        "biology",
        "chemistry",
        "latin",
        "general",
      ],
      achievement_type: [
        "questions_solved",
        "time_earned",
        "streak",
        "accuracy",
        "speed",
        "milestone",
        "perfect_sessions",
        "total_questions",
        "fast_sessions",
        "subjects_mastered",
      ],
    },
  },
} as const

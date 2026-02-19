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
      ai_question_cache: {
        Row: {
          correct_answer: Json
          created_at: string
          difficulty: string
          grade: number
          hint: string | null
          id: string
          last_served_at: string | null
          options: Json | null
          question_text: string
          question_type: string
          subject: string
          task: string | null
          times_served: number
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          difficulty: string
          grade: number
          hint?: string | null
          id?: string
          last_served_at?: string | null
          options?: Json | null
          question_text: string
          question_type: string
          subject: string
          task?: string | null
          times_served?: number
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          difficulty?: string
          grade?: number
          hint?: string | null
          id?: string
          last_served_at?: string | null
          options?: Json | null
          question_text?: string
          question_type?: string
          subject?: string
          task?: string | null
          times_served?: number
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
          is_priority: boolean
          is_visible: boolean
          parent_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          is_priority?: boolean
          is_visible?: boolean
          parent_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          is_priority?: boolean
          is_visible?: boolean
          parent_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_request_summary: {
        Row: {
          created_at: string
          id: string
          request_date: string
          total_minutes_approved: number
          total_minutes_requested: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_date?: string
          total_minutes_approved?: number
          total_minutes_requested?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_date?: string
          total_minutes_approved?: number
          total_minutes_requested?: number
          updated_at?: string
          user_id?: string
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
          avatar_color: string | null
          avatar_id: string | null
          created_at: string | null
          grade: number | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_id?: string | null
          created_at?: string | null
          grade?: number | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_id?: string | null
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
          template_id: string | null
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
          template_id?: string | null
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
          template_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      screen_time_requests: {
        Row: {
          child_id: string
          created_at: string
          earned_minutes: number
          expires_at: string
          id: string
          parent_id: string
          parent_response: string | null
          request_message: string | null
          requested_minutes: number
          responded_at: string | null
          status: string
        }
        Insert: {
          child_id: string
          created_at?: string
          earned_minutes: number
          expires_at?: string
          id?: string
          parent_id: string
          parent_response?: string | null
          request_message?: string | null
          requested_minutes: number
          responded_at?: string | null
          status?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          earned_minutes?: number
          expires_at?: string
          id?: string
          parent_id?: string
          parent_response?: string | null
          request_message?: string | null
          requested_minutes?: number
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      user_difficulty_profiles: {
        Row: {
          category: string
          created_at: string | null
          current_level: number
          grade: number
          id: string
          last_updated: string | null
          learning_velocity: number
          mastery_score: number
          strengths: string[] | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_level?: number
          grade: number
          id?: string
          last_updated?: string | null
          learning_velocity?: number
          mastery_score?: number
          strengths?: string[] | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_level?: number
          grade?: number
          id?: string
          last_updated?: string | null
          learning_velocity?: number
          mastery_score?: number
          strengths?: string[] | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      user_earned_minutes: {
        Row: {
          created_at: string
          earned_at: string
          id: string
          minutes_earned: number
          minutes_remaining: number | null
          minutes_requested: number
          session_id: string
          session_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          earned_at?: string
          id?: string
          minutes_earned?: number
          minutes_remaining?: number | null
          minutes_requested?: number
          session_id: string
          session_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          earned_at?: string
          id?: string
          minutes_earned?: number
          minutes_remaining?: number | null
          minutes_requested?: number
          session_id?: string
          session_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      claim_invitation_code: {
        Args: { claiming_child_id: string; code_to_claim: string }
        Returns: Json
      }
      cleanup_expired_codes: { Args: never; Returns: undefined }
      cleanup_expired_screen_time_requests: { Args: never; Returns: undefined }
      generate_invitation_code: { Args: never; Returns: string }
      get_cache_stats: {
        Args: never
        Returns: {
          avg_times_served: number
          grade: number
          last_added_at: string
          subject: string
          total_questions: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { user_id: string }; Returns: boolean }
      trigger_grade_upgrade: { Args: never; Returns: Json }
      update_achievement_progress: {
        Args: {
          p_category: string
          p_increment?: number
          p_type: string
          p_user_id: string
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
        | "monthly_active"
        | "weekly_consistency"
        | "seasonal_learner"
        | "milestone_months"
        | "progress_tracker"
        | "dedication_levels"
        | "knowledge_accumulator"
        | "early_bird"
        | "night_owl"
        | "weekend_warrior"
        | "comeback_kid"
        | "mentor_ready"
        | "accuracy_improvement"
        | "long_term_dedication"
        | "time_based_consistency"
        | "overtime_learning"
        | "improvement"
        | "accuracy_master"
        | "marathon_sessions"
        | "speed_master"
        | "consistency"
        | "comeback"
        | "subject_explorer"
        | "midnight_scholar"
        | "perfect_week"
        | "time_traveler"
        | "knowledge_thirst"
        | "supernova"
      app_role: "admin" | "moderator" | "user"
      question_variant: "MULTIPLE_CHOICE" | "SORT" | "MATCH" | "FREETEXT"
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
        "monthly_active",
        "weekly_consistency",
        "seasonal_learner",
        "milestone_months",
        "progress_tracker",
        "dedication_levels",
        "knowledge_accumulator",
        "early_bird",
        "night_owl",
        "weekend_warrior",
        "comeback_kid",
        "mentor_ready",
        "accuracy_improvement",
        "long_term_dedication",
        "time_based_consistency",
        "overtime_learning",
        "improvement",
        "accuracy_master",
        "marathon_sessions",
        "speed_master",
        "consistency",
        "comeback",
        "subject_explorer",
        "midnight_scholar",
        "perfect_week",
        "time_traveler",
        "knowledge_thirst",
        "supernova",
      ],
      app_role: ["admin", "moderator", "user"],
      question_variant: ["MULTIPLE_CHOICE", "SORT", "MATCH", "FREETEXT"],
    },
  },
} as const

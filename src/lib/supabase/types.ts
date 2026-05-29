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
      exercises: {
        Row: {
          completed: boolean | null
          equipment: string | null
          id: string
          muscle_group: string | null
          name: string | null
          notes: string | null
          order_index: number | null
          skipped: boolean | null
          target_reps: number | null
          target_sets: number | null
          target_weight_kg: number | null
          workout_id: string | null
        }
        Insert: {
          completed?: boolean | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string | null
          notes?: string | null
          order_index?: number | null
          skipped?: boolean | null
          target_reps?: number | null
          target_sets?: number | null
          target_weight_kg?: number | null
          workout_id?: string | null
        }
        Update: {
          completed?: boolean | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string | null
          notes?: string | null
          order_index?: number | null
          skipped?: boolean | null
          target_reps?: number | null
          target_sets?: number | null
          target_weight_kg?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      programme: {
        Row: {
          created_at: string | null
          generated_by: string | null
          id: string
          is_active: boolean | null
          raw_json: Json | null
          user_id: string | null
          week_number: number | null
        }
        Insert: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          raw_json?: Json | null
          user_id?: string | null
          week_number?: number | null
        }
        Update: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          raw_json?: Json | null
          user_id?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          notes: string | null
          reps_completed: number | null
          set_number: number | null
          skipped: boolean | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          reps_completed?: number | null
          set_number?: number | null
          skipped?: boolean | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          reps_completed?: number | null
          set_number?: number | null
          skipped?: boolean | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          age: number | null
          areas_to_avoid: string[] | null
          body_fat_percentage: number | null
          cardio_frequency: string | null
          cardio_types: string[] | null
          created_at: string | null
          goal: string | null
          height: number | null
          id: string
          job_type: string | null
          lifting_frequency: string | null
          preferred_ai_model: string | null
          secondary_goal: string | null
          sex: string | null
          unit_preference: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          areas_to_avoid?: string[] | null
          body_fat_percentage?: number | null
          cardio_frequency?: string | null
          cardio_types?: string[] | null
          created_at?: string | null
          goal?: string | null
          height?: number | null
          id: string
          job_type?: string | null
          lifting_frequency?: string | null
          preferred_ai_model?: string | null
          secondary_goal?: string | null
          sex?: string | null
          unit_preference?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          areas_to_avoid?: string[] | null
          body_fat_percentage?: number | null
          cardio_frequency?: string | null
          cardio_types?: string[] | null
          created_at?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          job_type?: string | null
          lifting_frequency?: string | null
          preferred_ai_model?: string | null
          secondary_goal?: string | null
          sex?: string | null
          unit_preference?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          ai_generated: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          programme_id: string | null
          scheduled_date: string | null
          user_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          programme_id?: string | null
          scheduled_date?: string | null
          user_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          programme_id?: string | null
          scheduled_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programme"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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

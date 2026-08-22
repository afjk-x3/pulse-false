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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_configs: {
        Row: {
          default_holiday_calendar: string
          eap_referral_url: string | null
          emergency_kill_switch: boolean
          id: string
          privacy_floor: number
          standard_workday_end: string
          standard_workday_start: string
          updated_at: string
          webcam_cv_global_disabled: boolean
        }
        Insert: {
          default_holiday_calendar?: string
          eap_referral_url?: string | null
          emergency_kill_switch?: boolean
          id?: string
          privacy_floor?: number
          standard_workday_end?: string
          standard_workday_start?: string
          updated_at?: string
          webcam_cv_global_disabled?: boolean
        }
        Update: {
          default_holiday_calendar?: string
          eap_referral_url?: string | null
          emergency_kill_switch?: boolean
          id?: string
          privacy_floor?: number
          standard_workday_end?: string
          standard_workday_start?: string
          updated_at?: string
          webcam_cv_global_disabled?: boolean
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bri_shift_records: {
        Row: {
          created_at: string
          feature_weights: Json
          id: string
          new_band: string
          previous_band: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_weights?: Json
          id?: string
          new_band: string
          previous_band: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_weights?: Json
          id?: string
          new_band?: string
          previous_band?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bri_shift_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_overrides: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          organizer_id: string
          override_reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          organizer_id: string
          override_reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          organizer_id?: string
          override_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_overrides_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "scheduled_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_overrides_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_roulette_pairings: {
        Row: {
          created_at: string
          id: string
          paired_at: string
          status: string
          user_1_id: string
          user_2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paired_at?: string
          status?: string
          user_1_id: string
          user_2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paired_at?: string
          status?: string
          user_1_id?: string
          user_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_roulette_pairings_user_1_id_fkey"
            columns: ["user_1_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_roulette_pairings_user_2_id_fkey"
            columns: ["user_2_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      kudos_posts: {
        Row: {
          category: Database["public"]["Enums"]["kudos_category"]
          created_at: string
          id: string
          likes_count: number
          message: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["kudos_category"]
          created_at?: string
          id?: string
          likes_count?: number
          message: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["kudos_category"]
          created_at?: string
          id?: string
          likes_count?: number
          message?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_posts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_posts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_logs: {
        Row: {
          created_at: string
          energy_level: number | null
          id: string
          mood_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_messages: {
        Row: {
          created_at: string
          deliver_after: string
          id: string
          payload: Json
          recipient_id: string
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deliver_after: string
          id?: string
          payload?: Json
          recipient_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deliver_after?: string
          id?: string
          payload?: Json
          recipient_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbox_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbox_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_meetings: {
        Row: {
          attendees: Json
          created_at: string
          description: string | null
          end_time: string
          id: string
          is_compliant: boolean
          organizer_id: string
          start_time: string
          title: string
        }
        Insert: {
          attendees?: Json
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          is_compliant?: boolean
          organizer_id: string
          start_time: string
          title: string
        }
        Update: {
          attendees?: Json
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          is_compliant?: boolean
          organizer_id?: string
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_configs: {
        Row: {
          data_residency_region: string
          id: string
          kms_key_url: string | null
          scim_enabled: boolean
          sso_provider: string | null
          updated_at: string
        }
        Insert: {
          data_residency_region?: string
          id?: string
          kms_key_url?: string | null
          scim_enabled?: boolean
          sso_provider?: string | null
          updated_at?: string
        }
        Update: {
          data_residency_region?: string
          id?: string
          kms_key_url?: string | null
          scim_enabled?: boolean
          sso_provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_circle_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          pseudonym_alias: string | null
          topic_channel: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          pseudonym_alias?: string | null
          topic_channel: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pseudonym_alias?: string | null
          topic_channel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_circle_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          address: string | null
          avatar: string | null
          camera_telemetry_consented: boolean
          created_at: string
          deletion_reason: string | null
          deletion_scheduled_at: string | null
          dyslexic_font_enabled: boolean
          email: string
          full_name: string
          high_contrast_enabled: boolean
          id: string
          job_title: string | null
          phone: string | null
          profile_image: string | null
          reading_ruler_enabled: boolean
          role: string
          share_bri_with_manager: boolean
          status: Database["public"]["Enums"]["account_status"]
          timezone: string
          updated_at: string
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          address?: string | null
          avatar?: string | null
          camera_telemetry_consented?: boolean
          created_at?: string
          deletion_reason?: string | null
          deletion_scheduled_at?: string | null
          dyslexic_font_enabled?: boolean
          email: string
          full_name: string
          high_contrast_enabled?: boolean
          id?: string
          job_title?: string | null
          phone?: string | null
          profile_image?: string | null
          reading_ruler_enabled?: boolean
          role?: string
          share_bri_with_manager?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          address?: string | null
          avatar?: string | null
          camera_telemetry_consented?: boolean
          created_at?: string
          deletion_reason?: string | null
          deletion_scheduled_at?: string | null
          dyslexic_font_enabled?: boolean
          email?: string
          full_name?: string
          high_contrast_enabled?: boolean
          id?: string
          job_title?: string | null
          phone?: string | null
          profile_image?: string | null
          reading_ruler_enabled?: boolean
          role?: string
          share_bri_with_manager?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_status:
        | "active"
        | "disabled"
        | "pending_deletion_approval"
        | "scheduled_for_deletion"
      kudos_category: "Collaboration" | "Gratitude" | "Inspiration"
      message_status: "queued" | "delivered" | "canceled"
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
      account_status: [
        "active",
        "disabled",
        "pending_deletion_approval",
        "scheduled_for_deletion",
      ],
      kudos_category: ["Collaboration", "Gratitude", "Inspiration"],
      message_status: ["queued", "delivered", "canceled"],
    },
  },
} as const

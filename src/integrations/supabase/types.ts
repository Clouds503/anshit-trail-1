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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_queue: {
        Row: {
          blog_id: string | null
          created_at: string
          error_message: string | null
          id: string
          keywords: string[] | null
          scheduled_date: string | null
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          blog_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          scheduled_date?: string | null
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          blog_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          scheduled_date?: string | null
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_queue_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_auto_generated: boolean | null
          is_published: boolean | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_auto_generated?: boolean | null
          is_published?: boolean | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_auto_generated?: boolean | null
          is_published?: boolean | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      best_courses: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          program_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          program_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          program_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "best_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      button_routes: {
        Row: {
          button_key: string
          id: string
          label: string | null
          route: string
          updated_at: string | null
        }
        Insert: {
          button_key: string
          id?: string
          label?: string | null
          route: string
          updated_at?: string | null
        }
        Update: {
          button_key?: string
          id?: string
          label?: string | null
          route?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_info: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          amount: number | null
          bill_number: string | null
          created_at: string
          email: string
          id: string
          name: string
          next_batch_date: string | null
          payment_status: string
          phone: string
          preferred_batch_time: string
          program: string
          program_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
        }
        Insert: {
          amount?: number | null
          bill_number?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          next_batch_date?: string | null
          payment_status?: string
          phone: string
          preferred_batch_time: string
          program: string
          program_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
        }
        Update: {
          amount?: number | null
          bill_number?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          next_batch_date?: string | null
          payment_status?: string
          phone?: string
          preferred_batch_time?: string
          program?: string
          program_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          section_id: string | null
          sort_order: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          section_id?: string | null
          sort_order?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          section_id?: string | null
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "footer_links_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "footer_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_sections: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      header_contacts: {
        Row: {
          contact_type: string
          created_at: string
          href: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          contact_type?: string
          created_at?: string
          href?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          href?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      header_links: {
        Row: {
          created_at: string
          href: string
          id: string
          is_active: boolean
          is_highlight: boolean
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          is_active?: boolean
          is_highlight?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          is_active?: boolean
          is_highlight?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          lead_type: string
          name: string
          phone: string
          program: string
          source_page: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          lead_type?: string
          name: string
          phone: string
          program: string
          source_page?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          lead_type?: string
          name?: string
          phone?: string
          program?: string
          source_page?: string | null
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content: Json
          created_at: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          id: string
          is_active: boolean | null
          meta: Json | null
          page_slug: string
          page_title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          id?: string
          is_active?: boolean | null
          meta?: Json | null
          page_slug: string
          page_title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          id?: string
          is_active?: boolean | null
          meta?: Json | null
          page_slug?: string
          page_title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string | null
          curriculum: Json | null
          description: string | null
          duration: string | null
          highlights: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_trending: boolean | null
          level: string | null
          modules: Json | null
          next_batch_date: string | null
          price: number | null
          short_description: string | null
          slug: string
          sort_order: number | null
          syllabus_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          curriculum?: Json | null
          description?: string | null
          duration?: string | null
          highlights?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_trending?: boolean | null
          level?: string | null
          modules?: Json | null
          next_batch_date?: string | null
          price?: number | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          syllabus_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          curriculum?: Json | null
          description?: string | null
          duration?: string | null
          highlights?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_trending?: boolean | null
          level?: string | null
          modules?: Json | null
          next_batch_date?: string | null
          price?: number | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          syllabus_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          alt_texts: Json | null
          auto_generated: boolean | null
          canonical_url: string | null
          description: string | null
          focus_keyword: string | null
          heading_suggestions: Json | null
          id: string
          indexing_enabled: boolean | null
          internal_links: Json | null
          keywords: string[] | null
          og_image: string | null
          page_path: string
          robots_directive: string | null
          schema_markup: Json | null
          secondary_keywords: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          alt_texts?: Json | null
          auto_generated?: boolean | null
          canonical_url?: string | null
          description?: string | null
          focus_keyword?: string | null
          heading_suggestions?: Json | null
          id?: string
          indexing_enabled?: boolean | null
          internal_links?: Json | null
          keywords?: string[] | null
          og_image?: string | null
          page_path: string
          robots_directive?: string | null
          schema_markup?: Json | null
          secondary_keywords?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          alt_texts?: Json | null
          auto_generated?: boolean | null
          canonical_url?: string | null
          description?: string | null
          focus_keyword?: string | null
          heading_suggestions?: Json | null
          id?: string
          indexing_enabled?: boolean | null
          internal_links?: Json | null
          keywords?: string[] | null
          og_image?: string | null
          page_path?: string
          robots_directive?: string | null
          schema_markup?: Json | null
          secondary_keywords?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string | null
          display_in: string[]
          icon: string
          id: string
          is_active: boolean | null
          platform: string
          sort_order: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          display_in?: string[]
          icon: string
          id?: string
          is_active?: boolean | null
          platform: string
          sort_order?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          display_in?: string[]
          icon?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: []
      }
      stats: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          label: string
          sort_order: number | null
          suffix: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          icon: string
          id?: string
          label: string
          sort_order?: number | null
          suffix?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          label?: string
          sort_order?: number | null
          suffix?: string | null
          value?: number
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          placed_at: string | null
          program_name: string
          sort_order: number
          status: string
          status_on: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          placed_at?: string | null
          program_name: string
          sort_order?: number
          status?: string
          status_on?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          placed_at?: string | null
          program_name?: string
          sort_order?: number
          status?: string
          status_on?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          company: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          rating: number | null
          role: string | null
          sort_order: number | null
        }
        Insert: {
          company?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Update: {
          company?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      trainers: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          mastery_program: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          mastery_program: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          mastery_program?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

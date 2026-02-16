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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_workflows: {
        Row: {
          completed_at: string | null
          created_at: string | null
          event_id: string | null
          id: string
          input_json: Json | null
          output_json: Json | null
          program_id: string | null
          status: string | null
          user_id: string | null
          workflow_type: Database["public"]["Enums"]["ai_workflow_type"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          program_id?: string | null
          status?: string | null
          user_id?: string | null
          workflow_type: Database["public"]["Enums"]["ai_workflow_type"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          program_id?: string | null
          status?: string | null
          user_id?: string | null
          workflow_type?: Database["public"]["Enums"]["ai_workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_workflows_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_workflows_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "award_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_info: {
        Row: {
          airport_code: string
          airport_name: string
          created_at: string | null
          distance_miles: number | null
          drive_time_minutes: number | null
          event_id: string
          id: string
          is_primary: boolean | null
          rental_car_info: string | null
          rideshare_estimate: string | null
          shuttle_info: string | null
          transportation_options: Json | null
        }
        Insert: {
          airport_code: string
          airport_name: string
          created_at?: string | null
          distance_miles?: number | null
          drive_time_minutes?: number | null
          event_id: string
          id?: string
          is_primary?: boolean | null
          rental_car_info?: string | null
          rideshare_estimate?: string | null
          shuttle_info?: string | null
          transportation_options?: Json | null
        }
        Update: {
          airport_code?: string
          airport_name?: string
          created_at?: string | null
          distance_miles?: number | null
          drive_time_minutes?: number | null
          event_id?: string
          id?: string
          is_primary?: boolean | null
          rental_car_info?: string | null
          rideshare_estimate?: string | null
          shuttle_info?: string | null
          transportation_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "airport_info_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_episodes: {
        Row: {
          id: string
          podcast_id: string
          title: string | null
          description: string | null
          audio_url: string | null
          duration: string | null
          published_at: string | null
          episode_artwork_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          podcast_id: string
          title?: string | null
          description?: string | null
          audio_url?: string | null
          duration?: string | null
          published_at?: string | null
          episode_artwork_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          podcast_id?: string
          title?: string | null
          description?: string | null
          audio_url?: string | null
          duration?: string | null
          published_at?: string | null
          episode_artwork_url?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episodes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          id: string
          feed_url: string
          title: string | null
          description: string | null
          author: string | null
          artwork_url: string | null
          website_url: string | null
          category: string | null
          language: string | null
          episode_count: number | null
          last_episode_date: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          feed_url: string
          title?: string | null
          description?: string | null
          author?: string | null
          artwork_url?: string | null
          website_url?: string | null
          category?: string | null
          language?: string | null
          episode_count?: number | null
          last_episode_date?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          feed_url?: string
          title?: string | null
          description?: string | null
          author?: string | null
          artwork_url?: string | null
          website_url?: string | null
          category?: string | null
          language?: string | null
          episode_count?: number | null
          last_episode_date?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      attendees: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string
          first_name: string
          id: string
          last_name: string
          order_id: string
          phone: string | null
          qr_code: string | null
          ticket_type_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email: string
          first_name: string
          id?: string
          last_name: string
          order_id: string
          phone?: string | null
          qr_code?: string | null
          ticket_type_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          order_id?: string
          phone?: string | null
          qr_code?: string | null
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendees_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendees_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      award_categories: {
        Row: {
          allow_public_voting: boolean | null
          created_at: string | null
          description: string | null
          id: string
          max_nominations: number | null
          name: string
          program_id: string
          rules: string | null
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          allow_public_voting?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_nominations?: number | null
          name: string
          program_id: string
          rules?: string | null
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          allow_public_voting?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_nominations?: number | null
          name?: string
          program_id?: string
          rules?: string | null
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "award_categories_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "award_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      award_programs: {
        Row: {
          brand_id: string
          ceremony_date: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          is_published: boolean | null
          judging_end: string | null
          judging_start: string | null
          nomination_end: string | null
          nomination_start: string | null
          public_voting_end: string | null
          public_voting_start: string | null
          slug: string
          title: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          brand_id: string
          ceremony_date?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_published?: boolean | null
          judging_end?: string | null
          judging_start?: string | null
          nomination_end?: string | null
          nomination_start?: string | null
          public_voting_end?: string | null
          public_voting_start?: string | null
          slug: string
          title: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          brand_id?: string
          ceremony_date?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_published?: boolean | null
          judging_end?: string | null
          judging_start?: string | null
          nomination_end?: string | null
          nomination_start?: string | null
          public_voting_end?: string | null
          public_voting_start?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "award_programs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_programs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          event_id: string
          id: string
          method: Database["public"]["Enums"]["checkin_method"] | null
          order_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          event_id: string
          id?: string
          method?: Database["public"]["Enums"]["checkin_method"] | null
          order_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          event_id?: string
          id?: string
          method?: Database["public"]["Enums"]["checkin_method"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_add_ons: {
        Row: {
          add_on_type: string | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          image_url: string | null
          inventory: number | null
          inventory_sold: number | null
          is_active: boolean | null
          name: string
          price: number | null
          requires_shipping: boolean | null
          sort_order: number | null
          variants: Json | null
        }
        Insert: {
          add_on_type?: string | null
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          image_url?: string | null
          inventory?: number | null
          inventory_sold?: number | null
          is_active?: boolean | null
          name: string
          price?: number | null
          requires_shipping?: boolean | null
          sort_order?: number | null
          variants?: Json | null
        }
        Update: {
          add_on_type?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          image_url?: string | null
          inventory?: number | null
          inventory_sold?: number | null
          is_active?: boolean | null
          name?: string
          price?: number | null
          requires_shipping?: boolean | null
          sort_order?: number | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_add_ons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_engagement_metrics: {
        Row: {
          id: string
          event_id: string
          metric_type: string
          period_start: string
          period_end: string
          value: number
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          metric_type: string
          period_start: string
          period_end: string
          value: number
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          metric_type?: string
          period_start?: string
          period_end?: string
          value?: number
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_engagement_metrics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_members: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          event_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          permissions: Json | null
          role: Database["public"]["Enums"]["event_team_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["event_team_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["event_team_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          brand_id: string
          capacity: number | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_published: boolean | null
          organization_id: string
          registration_deadline: string | null
          slug: string
          start_date: string | null
          state: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          address?: string | null
          brand_id: string
          capacity?: number | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_published?: boolean | null
          organization_id: string
          registration_deadline?: string | null
          slug: string
          start_date?: string | null
          state?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string
          capacity?: number | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_published?: boolean | null
          organization_id?: string
          registration_deadline?: string | null
          slug?: string
          start_date?: string | null
          state?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_room_blocks: {
        Row: {
          address: string | null
          amenities: Json | null
          block_size: number | null
          booking_code: string | null
          booking_link: string | null
          check_in_date: string | null
          check_out_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          cutoff_date: string | null
          event_id: string
          hotel_name: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          notes: string | null
          phone: string | null
          rate_per_night: number | null
          rooms_booked: number | null
          state: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          block_size?: number | null
          booking_code?: string | null
          booking_link?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cutoff_date?: string | null
          event_id: string
          hotel_name: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          rate_per_night?: number | null
          rooms_booked?: number | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          block_size?: number | null
          booking_code?: string | null
          booking_link?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cutoff_date?: string | null
          event_id?: string
          hotel_name?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          rate_per_night?: number | null
          rooms_booked?: number | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_room_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          assigned_at: string | null
          category_id: string | null
          id: string
          judge_id: string
          program_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          category_id?: string | null
          id?: string
          judge_id: string
          program_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          category_id?: string | null
          id?: string
          judge_id?: string
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "award_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          nominee_description: string | null
          nominee_email: string | null
          nominee_name: string
          program_id: string
          public_votes: number | null
          status: Database["public"]["Enums"]["nomination_status"] | null
          submission_data: Json | null
          submitted_by: string | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          nominee_description?: string | null
          nominee_email?: string | null
          nominee_name: string
          program_id: string
          public_votes?: number | null
          status?: Database["public"]["Enums"]["nomination_status"] | null
          submission_data?: Json | null
          submitted_by?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          nominee_description?: string | null
          nominee_email?: string | null
          nominee_name?: string
          program_id?: string
          public_votes?: number | null
          status?: Database["public"]["Enums"]["nomination_status"] | null
          submission_data?: Json | null
          submitted_by?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nominations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nominations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "award_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_add_ons: {
        Row: {
          add_on_id: string
          created_at: string | null
          id: string
          order_id: string
          quantity: number | null
          unit_price: number
          variant_selection: Json | null
        }
        Insert: {
          add_on_id: string
          created_at?: string | null
          id?: string
          order_id: string
          quantity?: number | null
          unit_price: number
          variant_selection?: Json | null
        }
        Update: {
          add_on_id?: string
          created_at?: string | null
          id?: string
          order_id?: string
          quantity?: number | null
          unit_price?: number
          variant_selection?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_add_ons_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "event_add_ons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_add_ons_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attendee_info: Json | null
          billing_info: Json | null
          confirmation_sent_at: string | null
          created_at: string | null
          discount_amount: number | null
          event_id: string
          id: string
          metadata: Json | null
          notes: string | null
          payment_intent_id: string | null
          payment_provider: string | null
          promo_code_id: string | null
          quantity: number | null
          shipping_info: Json | null
          source: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tax_amount: number | null
          ticket_type_id: string | null
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attendee_info?: Json | null
          billing_info?: Json | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          event_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          promo_code_id?: string | null
          quantity?: number | null
          shipping_info?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          ticket_type_id?: string | null
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendee_info?: Json | null
          billing_info?: Json | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          event_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          promo_code_id?: string | null
          quantity?: number | null
          shipping_info?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          ticket_type_id?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          location: string | null
          military_branch: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          military_branch?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          military_branch?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          applicable_ticket_types: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          discount_type: string
          discount_value: number
          event_id: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          times_used: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_ticket_types?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: string
          discount_value: number
          event_id: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_ticket_types?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          event_id?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          esign_link: string | null
          event_id: string | null
          id: string
          package_id: string | null
          program_id: string | null
          sent_at: string | null
          signed_at: string | null
          sponsor_id: string
          status: Database["public"]["Enums"]["proposal_status"] | null
          time_on_page: number | null
          title: string
          updated_at: string | null
          view_count: number | null
          viewed_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          esign_link?: string | null
          event_id?: string | null
          id?: string
          package_id?: string | null
          program_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          sponsor_id: string
          status?: Database["public"]["Enums"]["proposal_status"] | null
          time_on_page?: number | null
          title: string
          updated_at?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          esign_link?: string | null
          event_id?: string | null
          id?: string
          package_id?: string | null
          program_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          sponsor_id?: string
          status?: Database["public"]["Enums"]["proposal_status"] | null
          time_on_page?: number | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "sponsor_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "award_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      public_votes: {
        Row: {
          id: string
          nomination_id: string
          voted_at: string | null
          voter_id: string | null
          voter_ip: string | null
        }
        Insert: {
          id?: string
          nomination_id: string
          voted_at?: string | null
          voter_id?: string | null
          voter_ip?: string | null
        }
        Update: {
          id?: string
          nomination_id?: string
          voted_at?: string | null
          voter_id?: string | null
          voter_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_votes_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string | null
          event_id: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          placeholder: string | null
          sort_order: number | null
          ticket_type_id: string | null
          validation_rules: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string | null
          event_id: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          ticket_type_id?: string | null
          validation_rules?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string | null
          event_id?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          ticket_type_id?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_form_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_form_fields_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_responses: {
        Row: {
          created_at: string | null
          field_id: string
          file_url: string | null
          id: string
          order_id: string
          response_value: string | null
        }
        Insert: {
          created_at?: string | null
          field_id: string
          file_url?: string | null
          id?: string
          order_id: string
          response_value?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          file_url?: string | null
          id?: string
          order_id?: string
          response_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_responses_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "registration_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_responses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          comments: string | null
          id: string
          judge_id: string
          nomination_id: string
          rubric_scores: Json | null
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          comments?: string | null
          id?: string
          judge_id: string
          nomination_id: string
          rubric_scores?: Json | null
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          comments?: string | null
          id?: string
          judge_id?: string
          nomination_id?: string
          rubric_scores?: Json | null
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_packages: {
        Row: {
          benefits: Json | null
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          inventory: Json | null
          is_active: boolean | null
          max_sponsors: number | null
          name: string
          price: number | null
          program_id: string | null
          tier: string | null
        }
        Insert: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          inventory?: Json | null
          is_active?: boolean | null
          max_sponsors?: number | null
          name: string
          price?: number | null
          program_id?: string | null
          tier?: string | null
        }
        Update: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          inventory?: Json | null
          is_active?: boolean | null
          max_sponsors?: number | null
          name?: string
          price?: number | null
          program_id?: string | null
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_packages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_packages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "award_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          industries: string[] | null
          logo_url: string | null
          name: string
          notes: string | null
          organization_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          industries?: string[] | null
          logo_url?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          industries?: string[] | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_deals: {
        Row: {
          amount: number | null
          created_at: string | null
          custom_terms: string | null
          event_id: string | null
          id: string
          package_id: string | null
          program_id: string | null
          signed_at: string | null
          sponsor_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          custom_terms?: string | null
          event_id?: string | null
          id?: string
          package_id?: string | null
          program_id?: string | null
          signed_at?: string | null
          sponsor_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          custom_terms?: string | null
          event_id?: string | null
          id?: string
          package_id?: string | null
          program_id?: string | null
          signed_at?: string | null
          sponsor_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_deals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_deals_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "sponsor_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_deals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "award_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_deals_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          event_id: string
          expires_at: string | null
          id: string
          invited_by: string | null
          permissions: Json | null
          role: Database["public"]["Enums"]["event_team_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          event_id: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["event_team_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["event_team_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          benefits: Json | null
          created_at: string | null
          description: string | null
          early_bird_deadline: string | null
          early_bird_price: number | null
          event_id: string
          group_discount_percent: number | null
          group_min_size: number | null
          id: string
          is_active: boolean | null
          max_per_order: number | null
          name: string
          price: number | null
          quantity: number | null
          quantity_sold: number | null
          requires_approval: boolean | null
          restrictions: string | null
          sales_end: string | null
          sales_start: string | null
          sort_order: number | null
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          visibility: string | null
        }
        Insert: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          event_id: string
          group_discount_percent?: number | null
          group_min_size?: number | null
          id?: string
          is_active?: boolean | null
          max_per_order?: number | null
          name: string
          price?: number | null
          quantity?: number | null
          quantity_sold?: number | null
          requires_approval?: boolean | null
          restrictions?: string | null
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          visibility?: string | null
        }
        Update: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          event_id?: string
          group_discount_percent?: number | null
          group_min_size?: number | null
          id?: string
          is_active?: boolean | null
          max_per_order?: number | null
          name?: string
          price?: number | null
          quantity?: number | null
          quantity_sold?: number | null
          requires_approval?: boolean | null
          restrictions?: string | null
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      verifications: {
        Row: {
          id: string
          person_name: string
          claimed_branch: string | null
          claimed_rank: string | null
          claimed_status: string | null
          linkedin_url: string | null
          website_url: string | null
          verification_score: number | null
          status: string | null
          pdl_data: Json | null
          serp_results: Json | null
          firecrawl_data: Json | null
          ai_analysis: string | null
          evidence_sources: Json | null
          red_flags: Json | null
          notes: string | null
          verified_by: string | null
          created_at: string | null
          updated_at: string | null
          last_verified_at: string | null
        }
        Insert: {
          id?: string
          person_name: string
          claimed_branch?: string | null
          claimed_rank?: string | null
          claimed_status?: string | null
          linkedin_url?: string | null
          website_url?: string | null
          verification_score?: number | null
          status?: string | null
          pdl_data?: Json | null
          serp_results?: Json | null
          firecrawl_data?: Json | null
          ai_analysis?: string | null
          evidence_sources?: Json | null
          red_flags?: Json | null
          notes?: string | null
          verified_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_verified_at?: string | null
        }
        Update: {
          id?: string
          person_name?: string
          claimed_branch?: string | null
          claimed_rank?: string | null
          claimed_status?: string | null
          linkedin_url?: string | null
          website_url?: string | null
          verification_score?: number | null
          status?: string | null
          pdl_data?: Json | null
          serp_results?: Json | null
          firecrawl_data?: Json | null
          ai_analysis?: string | null
          evidence_sources?: Json | null
          red_flags?: Json | null
          notes?: string | null
          verified_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_verified_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          converted_order_id: string | null
          created_at: string | null
          email: string
          event_id: string
          id: string
          name: string | null
          notified_at: string | null
          phone: string | null
          quantity: number | null
          ticket_type_id: string | null
        }
        Insert: {
          converted_order_id?: string | null
          created_at?: string | null
          email: string
          event_id: string
          id?: string
          name?: string | null
          notified_at?: string | null
          phone?: string | null
          quantity?: number | null
          ticket_type_id?: string | null
        }
        Update: {
          converted_order_id?: string | null
          created_at?: string | null
          email?: string
          event_id?: string
          id?: string
          name?: string | null
          notified_at?: string | null
          phone?: string | null
          quantity?: number | null
          ticket_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_nomination_data: {
        Args: { nom: Database["public"]["Tables"]["nominations"]["Row"] }
        Returns: boolean
      }
      has_event_permission: {
        Args: { _event_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_event_role: {
        Args: {
          _event_id: string
          _roles: Database["public"]["Enums"]["event_team_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_event_admin: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_workflow_type:
        | "event_architect"
        | "awards_designer"
        | "sponsor_closer"
        | "attendee_concierge"
      app_role:
        | "super_admin"
        | "org_admin"
        | "brand_admin"
        | "event_planner"
        | "sponsor"
        | "judge"
        | "attendee"
      checkin_method: "qr" | "email" | "manual"
      event_team_role:
        | "owner"
        | "admin"
        | "event_manager"
        | "marketing_manager"
        | "registration_manager"
        | "vendor_manager"
        | "finance_manager"
        | "staff"
        | "view_only"
      event_type: "live" | "virtual" | "hybrid"
      nomination_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "finalist"
        | "winner"
        | "rejected"
      order_status: "pending" | "completed" | "cancelled" | "refunded"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "rejected"
        | "expired"
      ticket_type:
        | "free"
        | "paid"
        | "donation"
        | "vip"
        | "member"
        | "sponsor"
        | "comp"
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
      ai_workflow_type: [
        "event_architect",
        "awards_designer",
        "sponsor_closer",
        "attendee_concierge",
      ],
      app_role: [
        "super_admin",
        "org_admin",
        "brand_admin",
        "event_planner",
        "sponsor",
        "judge",
        "attendee",
      ],
      checkin_method: ["qr", "email", "manual"],
      event_team_role: [
        "owner",
        "admin",
        "event_manager",
        "marketing_manager",
        "registration_manager",
        "vendor_manager",
        "finance_manager",
        "staff",
        "view_only",
      ],
      event_type: ["live", "virtual", "hybrid"],
      nomination_status: [
        "draft",
        "submitted",
        "under_review",
        "finalist",
        "winner",
        "rejected",
      ],
      order_status: ["pending", "completed", "cancelled", "refunded"],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "rejected",
        "expired",
      ],
      ticket_type: [
        "free",
        "paid",
        "donation",
        "vip",
        "member",
        "sponsor",
        "comp",
      ],
    },
  },
} as const

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
      orders: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          metadata: Json | null
          payment_intent_id: string | null
          payment_provider: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          ticket_type_id: string | null
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          ticket_type_id?: string | null
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
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
      ticket_types: {
        Row: {
          benefits: Json | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          quantity: number | null
          quantity_sold: number | null
          restrictions: string | null
          sales_end: string | null
          sales_start: string | null
          ticket_type: Database["public"]["Enums"]["ticket_type"]
        }
        Insert: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          quantity?: number | null
          quantity_sold?: number | null
          restrictions?: string | null
          sales_end?: string | null
          sales_start?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
        }
        Update: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          quantity?: number | null
          quantity_sold?: number | null
          restrictions?: string | null
          sales_end?: string | null
          sales_start?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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

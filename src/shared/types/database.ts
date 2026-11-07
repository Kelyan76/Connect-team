// Fichier généré par `npm run db:types` — ne pas modifier à la main.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      absences: {
        Row: {
          id: string;
          team_id: string;
          collaborator_id: string;
          kind: Database['public']['Enums']['absence_kind'];
          start_date: string;
          end_date: string;
          status: Database['public']['Enums']['request_status'];
          comment: string;
          decision_comment: string;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          kind: Database['public']['Enums']['absence_kind'];
          start_date: string;
          end_date: string;
          status?: Database['public']['Enums']['request_status'];
          comment?: string;
          decision_comment?: string;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          kind?: Database['public']['Enums']['absence_kind'];
          start_date?: string;
          end_date?: string;
          status?: Database['public']['Enums']['request_status'];
          comment?: string;
          decision_comment?: string;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_pulses: {
        Row: {
          id: string;
          team_id: string;
          collaborator_id: string;
          day: string;
          mood: number;
          energy: number;
          note: string;
          created_at: string;
          updated_at: string;
          workload: number | null;
        };
        Insert: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          day?: string;
          mood: number;
          energy: number;
          note?: string;
          created_at?: string;
          updated_at?: string;
          workload?: number | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          day?: string;
          mood?: number;
          energy?: number;
          note?: string;
          created_at?: string;
          updated_at?: string;
          workload?: number | null;
        };
        Relationships: [];
      };
      decisions: {
        Row: {
          id: string;
          meeting_id: string;
          title: string;
          details: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          title: string;
          details?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          title?: string;
          details?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      delegation_domains: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          description: string;
          position: number;
        };
        Insert: {
          id?: string;
          team_id?: string;
          name: string;
          description?: string;
          position?: number;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          description?: string;
          position?: number;
        };
        Relationships: [];
      };
      delegations: {
        Row: {
          collaborator_id: string;
          domain_id: string;
          level: Database['public']['Enums']['delegation_level'];
          updated_at: string;
        };
        Insert: {
          collaborator_id: string;
          domain_id: string;
          level: Database['public']['Enums']['delegation_level'];
          updated_at?: string;
        };
        Update: {
          collaborator_id?: string;
          domain_id?: string;
          level?: Database['public']['Enums']['delegation_level'];
          updated_at?: string;
        };
        Relationships: [];
      };
      demo_accounts: {
        Row: {
          user_id: string;
          team_id: string;
          password: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          team_id: string;
          password: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          team_id?: string;
          password?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      feedbacks: {
        Row: {
          id: string;
          team_id: string;
          collaborator_id: string;
          author_id: string;
          kind: Database['public']['Enums']['feedback_kind'];
          body: string;
          is_shared: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          collaborator_id: string;
          author_id?: string;
          kind: Database['public']['Enums']['feedback_kind'];
          body: string;
          is_shared?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          author_id?: string;
          kind?: Database['public']['Enums']['feedback_kind'];
          body?: string;
          is_shared?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      key_result_history: {
        Row: {
          id: number;
          key_result_id: string;
          value: number;
          recorded_at: string;
          recorded_by: string | null;
        };
        Insert: {
          id?: number;
          key_result_id: string;
          value: number;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Update: {
          id?: number;
          key_result_id?: string;
          value?: number;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [];
      };
      key_results: {
        Row: {
          id: string;
          objective_id: string;
          title: string;
          unit: string;
          start_value: number;
          target_value: number;
          current_value: number;
          pending_value: number | null;
          pending_at: string | null;
          validated_at: string | null;
          position: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          objective_id: string;
          title: string;
          unit?: string;
          start_value?: number;
          target_value: number;
          current_value?: number;
          pending_value?: number | null;
          pending_at?: string | null;
          validated_at?: string | null;
          position?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          objective_id?: string;
          title?: string;
          unit?: string;
          start_value?: number;
          target_value?: number;
          current_value?: number;
          pending_value?: number | null;
          pending_at?: string | null;
          validated_at?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      login_events: {
        Row: {
          id: number;
          user_id: string;
          team_id: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          team_id: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          team_id?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      manager_notes: {
        Row: {
          id: string;
          collaborator_id: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collaborator_id: string;
          author_id?: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          collaborator_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_actions: {
        Row: {
          id: string;
          meeting_id: string;
          title: string;
          owner_id: string;
          due_date: string | null;
          status: Database['public']['Enums']['action_status'];
          done_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          title: string;
          owner_id: string;
          due_date?: string | null;
          status?: Database['public']['Enums']['action_status'];
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          title?: string;
          owner_id?: string;
          due_date?: string | null;
          status?: Database['public']['Enums']['action_status'];
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          team_id: string;
          title: string;
          held_on: string;
          participants: string[];
          notes: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          title: string;
          held_on: string;
          participants?: string[];
          notes?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          title?: string;
          held_on?: string;
          participants?: string[];
          notes?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      objectives: {
        Row: {
          id: string;
          team_id: string;
          scope: Database['public']['Enums']['objective_scope'];
          owner_id: string | null;
          title: string;
          description: string;
          start_date: string;
          due_date: string;
          archived: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          scope: Database['public']['Enums']['objective_scope'];
          owner_id?: string | null;
          title: string;
          description?: string;
          start_date: string;
          due_date: string;
          archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          scope?: Database['public']['Enums']['objective_scope'];
          owner_id?: string | null;
          title?: string;
          description?: string;
          start_date?: string;
          due_date?: string;
          archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          team_id: string;
          role: Database['public']['Enums']['app_role'];
          first_name: string;
          last_name: string;
          email: string;
          job_title: string;
          hired_on: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          team_id: string;
          role?: Database['public']['Enums']['app_role'];
          first_name: string;
          last_name: string;
          email: string;
          job_title: string;
          hired_on?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          role?: Database['public']['Enums']['app_role'];
          first_name?: string;
          last_name?: string;
          email?: string;
          job_title?: string;
          hired_on?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          team_id: string;
          code: string;
          name: string;
          client: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          code: string;
          name: string;
          client?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          code?: string;
          name?: string;
          client?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      review_actions: {
        Row: {
          id: string;
          review_id: string;
          title: string;
          owner_id: string;
          due_date: string | null;
          status: Database['public']['Enums']['action_status'];
          done_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          title: string;
          owner_id: string;
          due_date?: string | null;
          status?: Database['public']['Enums']['action_status'];
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          title?: string;
          owner_id?: string;
          due_date?: string | null;
          status?: Database['public']['Enums']['action_status'];
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_answers: {
        Row: {
          review_id: string;
          question_key: string;
          author: Database['public']['Enums']['answer_author'];
          value: Json;
          updated_at: string;
        };
        Insert: {
          review_id: string;
          question_key: string;
          author: Database['public']['Enums']['answer_author'];
          value: Json;
          updated_at?: string;
        };
        Update: {
          review_id?: string;
          question_key?: string;
          author?: Database['public']['Enums']['answer_author'];
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_requests: {
        Row: {
          id: string;
          team_id: string;
          collaborator_id: string;
          message: string;
          preferred_date: string | null;
          status: Database['public']['Enums']['request_status'];
          review_id: string | null;
          created_at: string;
          decided_at: string | null;
        };
        Insert: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          message?: string;
          preferred_date?: string | null;
          status?: Database['public']['Enums']['request_status'];
          review_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          message?: string;
          preferred_date?: string | null;
          status?: Database['public']['Enums']['request_status'];
          review_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
        };
        Relationships: [];
      };
      review_templates: {
        Row: {
          id: string;
          team_id: string;
          kind: Database['public']['Enums']['review_kind'];
          name: string;
          description: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          kind: Database['public']['Enums']['review_kind'];
          name: string;
          description?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          kind?: Database['public']['Enums']['review_kind'];
          name?: string;
          description?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          team_id: string;
          collaborator_id: string;
          manager_id: string;
          kind: Database['public']['Enums']['review_kind'];
          template_id: string | null;
          questions: Json;
          scheduled_at: string;
          duration_minutes: number;
          location: string;
          status: Database['public']['Enums']['review_status'];
          collaborator_prepared_at: string | null;
          manager_prepared_at: string | null;
          live_notes: string;
          summary: string;
          completed_at: string | null;
          collaborator_signed_at: string | null;
          manager_signed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          collaborator_id: string;
          manager_id?: string;
          kind: Database['public']['Enums']['review_kind'];
          template_id?: string | null;
          questions?: Json;
          scheduled_at: string;
          duration_minutes?: number;
          location?: string;
          status?: Database['public']['Enums']['review_status'];
          collaborator_prepared_at?: string | null;
          manager_prepared_at?: string | null;
          live_notes?: string;
          summary?: string;
          completed_at?: string | null;
          collaborator_signed_at?: string | null;
          manager_signed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          collaborator_id?: string;
          manager_id?: string;
          kind?: Database['public']['Enums']['review_kind'];
          template_id?: string | null;
          questions?: Json;
          scheduled_at?: string;
          duration_minutes?: number;
          location?: string;
          status?: Database['public']['Enums']['review_status'];
          collaborator_prepared_at?: string | null;
          manager_prepared_at?: string | null;
          live_notes?: string;
          summary?: string;
          completed_at?: string | null;
          collaborator_signed_at?: string | null;
          manager_signed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      skill_levels: {
        Row: {
          collaborator_id: string;
          skill_id: string;
          self_level: number | null;
          manager_level: number | null;
          validated_at: string | null;
          updated_at: string;
        };
        Insert: {
          collaborator_id: string;
          skill_id: string;
          self_level?: number | null;
          manager_level?: number | null;
          validated_at?: string | null;
          updated_at?: string;
        };
        Update: {
          collaborator_id?: string;
          skill_id?: string;
          self_level?: number | null;
          manager_level?: number | null;
          validated_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          name: string;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          category?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          team_id: string;
          project_id: string | null;
          title: string;
          description: string;
          assignee_id: string | null;
          priority: Database['public']['Enums']['task_priority'];
          status: Database['public']['Enums']['task_status'];
          due_date: string | null;
          position: number;
          created_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string;
          project_id?: string | null;
          title: string;
          description?: string;
          assignee_id?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['task_status'];
          due_date?: string | null;
          position?: number;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          project_id?: string | null;
          title?: string;
          description?: string;
          assignee_id?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['task_status'];
          due_date?: string | null;
          position?: number;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_settings: {
        Row: {
          team_id: string;
          no_one_to_one_days: number;
          overload_pct: number;
          underload_pct: number;
          overload_weeks: number;
          weather_drop_weeks: number;
          review_due_days: number;
          prep_reminder_days: number;
          max_absent: number;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          no_one_to_one_days?: number;
          overload_pct?: number;
          underload_pct?: number;
          overload_weeks?: number;
          weather_drop_weeks?: number;
          review_due_days?: number;
          prep_reminder_days?: number;
          max_absent?: number;
          updated_at?: string;
        };
        Update: {
          team_id?: string;
          no_one_to_one_days?: number;
          overload_pct?: number;
          underload_pct?: number;
          overload_weeks?: number;
          weather_drop_weeks?: number;
          review_due_days?: number;
          prep_reminder_days?: number;
          max_absent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          company: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      template_questions: {
        Row: {
          id: string;
          template_id: string;
          position: number;
          section: string;
          label: string;
          help: string;
          type: Database['public']['Enums']['question_type'];
          options: Json;
        };
        Insert: {
          id?: string;
          template_id: string;
          position?: number;
          section?: string;
          label: string;
          help?: string;
          type: Database['public']['Enums']['question_type'];
          options?: Json;
        };
        Update: {
          id?: string;
          template_id?: string;
          position?: number;
          section?: string;
          label?: string;
          help?: string;
          type?: Database['public']['Enums']['question_type'];
          options?: Json;
        };
        Relationships: [];
      };
      weather_entries: {
        Row: {
          id: string;
          collaborator_id: string;
          week_start: string;
          mood: number;
          workload: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          collaborator_id?: string;
          week_start: string;
          mood: number;
          workload: number;
          comment?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          collaborator_id?: string;
          week_start?: string;
          mood?: number;
          workload?: number;
          comment?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workload_allocations: {
        Row: {
          id: string;
          collaborator_id: string;
          project_id: string;
          week_start: string;
          percent: number;
        };
        Insert: {
          id?: string;
          collaborator_id: string;
          project_id: string;
          week_start: string;
          percent: number;
        };
        Update: {
          id?: string;
          collaborator_id?: string;
          project_id?: string;
          week_start?: string;
          percent?: number;
        };
        Relationships: [];
      };
    };
    Views: {
    };
    Functions: {
      auth_is_manager: { Args: Record<PropertyKey, never>; Returns: boolean };
      auth_is_self: { Args: { target: string }; Returns: boolean };
      auth_manages: { Args: { target: string }; Returns: boolean };
      auth_team_id: { Args: Record<PropertyKey, never>; Returns: string };
      can_read_answer: { Args: { p_review_id: string; p_author: Database['public']['Enums']['answer_author'] }; Returns: boolean };
      can_write_answer: { Args: { p_review_id: string; p_author: Database['public']['Enums']['answer_author'] }; Returns: boolean };
      paris_today: { Args: Record<PropertyKey, never>; Returns: string };
      propose_key_result_value: { Args: { p_key_result_id: string; p_value: number }; Returns: undefined };
      record_login: { Args: { p_user_agent?: string }; Returns: undefined };
      review_key_result_value: { Args: { p_key_result_id: string; p_accept: boolean }; Returns: undefined };
      set_self_skill_level: { Args: { p_skill_id: string; p_level: number }; Returns: undefined };
      sign_review: { Args: { p_review_id: string }; Returns: string };
      submit_review_preparation: { Args: { p_review_id: string }; Returns: undefined };
    };
    Enums: {
      absence_kind: 'conges_payes' | 'rtt' | 'maladie' | 'formation' | 'sans_solde';
      action_status: 'a_faire' | 'en_cours' | 'fait';
      answer_author: 'manager' | 'collaborateur';
      app_role: 'manager' | 'collaborateur';
      delegation_level: 'decide' | 'propose' | 'execute';
      feedback_kind: 'point_fort' | 'axe_progres' | 'reconnaissance';
      objective_scope: 'equipe' | 'individuel';
      question_type: 'texte' | 'echelle' | 'choix' | 'oui_non';
      request_status: 'en_attente' | 'validee' | 'refusee';
      review_kind: 'one_to_one' | 'annuel' | 'professionnel';
      review_status: 'planifie' | 'termine' | 'annule';
      task_priority: 'basse' | 'normale' | 'haute' | 'urgente';
      task_status: 'a_faire' | 'en_cours' | 'en_validation' | 'termine';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

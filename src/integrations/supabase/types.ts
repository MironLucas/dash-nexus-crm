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
      campanha_clientes: {
        Row: {
          campanha_id: string
          cliente_id: number
          created_at: string
          id: string
          status: Database["public"]["Enums"]["status_campanha"]
          updated_at: string
        }
        Insert: {
          campanha_id: string
          cliente_id: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["status_campanha"]
          updated_at?: string
        }
        Update: {
          campanha_id?: string
          cliente_id?: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["status_campanha"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_clientes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id_client"]
          },
        ]
      }
      campanha_vendedores: {
        Row: {
          campanha_id: string
          created_at: string
          id: string
          vendedor_id: number
        }
        Insert: {
          campanha_id: string
          created_at?: string
          id?: string
          vendedor_id: number
        }
        Update: {
          campanha_id?: string
          created_at?: string
          id?: string
          vendedor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "campanha_vendedores_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_vendedores_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["vendedor"]
          },
        ]
      }
      campanhas: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          criterios: Json | null
          descricao: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_campanha"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          criterios?: Json | null
          descricao?: string | null
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_campanha"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          criterios?: Json | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_campanha"]
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          aniversario: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          document: string | null
          email: string | null
          estado: string | null
          genero: string | null
          id_client: number
          logadouro: string | null
          nome_completo: string | null
          numero: string | null
          telefone: string | null
        }
        Insert: {
          aniversario?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          estado?: string | null
          genero?: string | null
          id_client: number
          logadouro?: string | null
          nome_completo?: string | null
          numero?: string | null
          telefone?: string | null
        }
        Update: {
          aniversario?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          estado?: string | null
          genero?: string | null
          id_client?: number
          logadouro?: string | null
          nome_completo?: string | null
          numero?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      itens: {
        Row: {
          id_itens: number
          id_order: number | null
          id_product: number | null
          product_desc: number | null
          product_final: number | null
          product_total: number | null
          variante1: string | null
          variante2: string | null
        }
        Insert: {
          id_itens: number
          id_order?: number | null
          id_product?: number | null
          product_desc?: number | null
          product_final?: number | null
          product_total?: number | null
          variante1?: string | null
          variante2?: string | null
        }
        Update: {
          id_itens?: number
          id_order?: number | null
          id_product?: number | null
          product_desc?: number | null
          product_final?: number | null
          product_total?: number | null
          variante1?: string | null
          variante2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_itens_orders"
            columns: ["id_order"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id_order"]
          },
          {
            foreignKeyName: "fk_itens_products"
            columns: ["id_product"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id_product"]
          },
        ]
      }
      orders: {
        Row: {
          canal_venda: string | null
          data_pedido: string | null
          id_client: number | null
          id_order: number
          status: string | null
          taxa_entrega: number | null
          transportadora: string | null
          valor_desconto: number | null
          valor_final: number | null
          valor_total: number | null
          vendedor: number | null
        }
        Insert: {
          canal_venda?: string | null
          data_pedido?: string | null
          id_client?: number | null
          id_order: number
          status?: string | null
          taxa_entrega?: number | null
          transportadora?: string | null
          valor_desconto?: number | null
          valor_final?: number | null
          valor_total?: number | null
          vendedor?: number | null
        }
        Update: {
          canal_venda?: string | null
          data_pedido?: string | null
          id_client?: number | null
          id_order?: number
          status?: string | null
          taxa_entrega?: number | null
          transportadora?: string | null
          valor_desconto?: number | null
          valor_final?: number | null
          valor_total?: number | null
          vendedor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_customers"
            columns: ["id_client"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id_client"]
          },
          {
            foreignKeyName: "fk_orders_vendedores"
            columns: ["vendedor"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["vendedor"]
          },
        ]
      }
      products: {
        Row: {
          ativo: string | null
          categoria: string | null
          descricao: string | null
          estoque: string | null
          id_product: number
          imagem: string | null
          preco: number | null
          sku: string | null
          tags: string | null
          titulo: string | null
          variante1: string | null
          variante2: string | null
        }
        Insert: {
          ativo?: string | null
          categoria?: string | null
          descricao?: string | null
          estoque?: string | null
          id_product: number
          imagem?: string | null
          preco?: number | null
          sku?: string | null
          tags?: string | null
          titulo?: string | null
          variante1?: string | null
          variante2?: string | null
        }
        Update: {
          ativo?: string | null
          categoria?: string | null
          descricao?: string | null
          estoque?: string | null
          id_product?: number
          imagem?: string | null
          preco?: number | null
          sku?: string | null
          tags?: string | null
          titulo?: string | null
          variante1?: string | null
          variante2?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
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
      users: {
        Row: {
          ativouser: string | null
          cargo: string | null
          emailuser: string | null
          id_users: number
          nome_user: string | null
          phoneuser: number | null
        }
        Insert: {
          ativouser?: string | null
          cargo?: string | null
          emailuser?: string | null
          id_users?: number
          nome_user?: string | null
          phoneuser?: number | null
        }
        Update: {
          ativouser?: string | null
          cargo?: string | null
          emailuser?: string | null
          id_users?: number
          nome_user?: string | null
          phoneuser?: number | null
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          nomevendedor: string | null
          user_id: string | null
          vendedor: number
        }
        Insert: {
          nomevendedor?: string | null
          user_id?: string | null
          vendedor: number
        }
        Update: {
          nomevendedor?: string | null
          user_id?: string | null
          vendedor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_readonly_query: { Args: { query_text: string }; Returns: Json }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "vendedor"
      status_campanha: "pendente" | "contatado" | "convertido"
      tipo_campanha: "aniversario" | "produto" | "custom"
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
      app_role: ["admin", "gerente", "vendedor"],
      status_campanha: ["pendente", "contatado", "convertido"],
      tipo_campanha: ["aniversario", "produto", "custom"],
    },
  },
} as const

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
          vendedor: number
        }
        Insert: {
          nomevendedor?: string | null
          vendedor: number
        }
        Update: {
          nomevendedor?: string | null
          vendedor?: number
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

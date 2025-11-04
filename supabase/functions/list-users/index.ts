import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Buscar usuários do auth
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error("Erro ao buscar usuários:", authError);
      throw authError;
    }

    // Buscar roles de todos os usuários
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error("Erro ao buscar roles:", rolesError);
    }

    // Mapear roles para os usuários
    const usersWithRoles = users.map(user => ({
      ...user,
      role: rolesData?.find(r => r.user_id === user.id)?.role
    }));

    return new Response(JSON.stringify({ users: usersWithRoles }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao listar usuários:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

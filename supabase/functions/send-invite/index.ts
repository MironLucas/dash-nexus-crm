import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  cargo: 'admin' | 'gerente' | 'vendedor';
  nome: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, cargo, nome }: InviteEmailRequest = await req.json();
    console.info("Enviando convite para:", email, "Cargo:", cargo);

    // Resend é opcional. Se não houver API key, seguimos apenas com o invite do Supabase

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

    // Criar usuário com convite
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          nome: nome,
          cargo: cargo
        },
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/completar-cadastro`
      }
    );

    if (inviteError) {
      console.error("Erro ao criar convite:", inviteError);
      // Se o usuário já existe, retornar 200 com payload amigável
      if (inviteError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ success: false, code: 'email_exists', error: 'Este email já está cadastrado no sistema.' }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw inviteError;
    }

    console.info("Usuário convidado:", userData.user?.id);

    // Inserir role do usuário
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user?.id,
        role: cargo
      });

    if (roleError) {
      console.error("Erro ao inserir role:", roleError);
      // Não falha a requisição, apenas loga o erro
    }

    // Enviar email customizado usando Resend API (opcional)
    const cargoLabel = cargo === 'admin' ? 'Administrador' : cargo === 'gerente' ? 'Gerente' : 'Vendedor';
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    let emailStatus = 'skipped';
    let emailId: string | undefined = undefined;

    if (RESEND_API_KEY) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Sistema CRM <onboarding@resend.dev>",
            to: [email],
            subject: "Convite para acessar o CRM",
            html: `
              <h1>Olá, ${nome}!</h1>
              <p>Você foi convidado para fazer parte da nossa equipe como <strong>${cargoLabel}</strong>.</p>
              <p>Para completar seu cadastro e criar sua senha, clique no link abaixo:</p>
              <p style="margin: 30px 0;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/completar-cadastro" 
                   style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Aceitar Convite e Criar Senha
                </a>
              </p>
              <p>Se você não solicitou este convite, pode ignorar este email.</p>
              <p>Atenciosamente,<br>Equipe CRM</p>
            `,
          }),
        });

        const emailData = await emailResponse.json();
        if (!emailResponse.ok) {
          console.error("Erro ao enviar email Resend:", emailData);
          emailStatus = 'failed';
        } else {
          console.info("Email enviado com sucesso:", emailData);
          emailStatus = 'sent';
          emailId = emailData.id;
        }
      } catch (e) {
        console.error('Falha ao enviar email com Resend:', e);
        emailStatus = 'failed';
      }
    } else {
      console.info('RESEND_API_KEY ausente - pulando envio de email customizado');
      emailStatus = 'not_configured';
    }

    return new Response(JSON.stringify({ 
      success: true,
      userId: userData.user?.id,
      emailStatus,
      emailId
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar convite:", error);
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
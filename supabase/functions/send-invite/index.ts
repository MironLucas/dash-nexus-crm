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

    // Construir URL do frontend corretamente
    const origin = req.headers.get('origin') || req.headers.get('referer');
    let frontendUrl = 'https://jckwavzrpyczdkbwxnqb.lovable.app';
    
    if (origin) {
      try {
        const url = new URL(origin);
        frontendUrl = `${url.protocol}//${url.host}`;
      } catch (e) {
        console.warn('Não foi possível extrair URL do origin/referer:', e);
      }
    }
    
    const redirectUrl = `${frontendUrl}/completar-cadastro`;
    console.info("Redirect URL:", redirectUrl);

    // Verificar se o usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users?.find(u => u.email === email);

    let userData;
    
    if (existingUser) {
      // Usuário já existe - gerar novo link de convite
      console.info("Usuário já existe, gerando novo link de convite");
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo: redirectUrl,
          data: {
            nome: nome,
            cargo: cargo
          }
        }
      });

      if (linkError) {
        console.error("Erro ao gerar link de convite:", linkError);
        throw linkError;
      }

      userData = { user: existingUser };
      
      // Atualizar metadata do usuário existente
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          nome: nome,
          cargo: cargo
        }
      });

      // Atualizar role na tabela user_roles
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: existingUser.id,
          role: cargo
        }, {
          onConflict: 'user_id,role'
        });

      if (roleError) {
        console.error("Erro ao atualizar role:", roleError);
      }

    } else {
      // Criar novo usuário com convite
      const { data: newUserData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            nome: nome,
            cargo: cargo
          },
          redirectTo: redirectUrl
        }
      );

      if (inviteError) {
        console.error("Erro ao criar convite:", inviteError);
        throw inviteError;
      }

      userData = newUserData;
      
      // Inserir role do novo usuário
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUserData.user?.id,
          role: cargo
        });

      if (roleError) {
        console.error("Erro ao inserir role:", roleError);
      }
    }

    console.info("Usuário processado:", userData.user?.id);

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
                <a href="${frontendUrl}/completar-cadastro" 
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
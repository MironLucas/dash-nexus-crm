import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    console.log("Gerando link de reset para:", email);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Credenciais do Supabase não configuradas");
    }

    // Criar cliente admin do Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Gerar link de reset de senha
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin")}/reset-password`,
      },
    });

    if (resetError) {
      console.error("Erro ao gerar link de reset:", resetError);
      // Evita erro no app e não expõe existência do usuário
      // Se o usuário não existir, retornamos sucesso genérico
      const status = (resetError as any)?.status;
      const code = (resetError as any)?.code;
      if (status === 404 || code === "user_not_found") {
        console.warn("Usuário não encontrado. Retornando sucesso genérico para evitar enumeração.");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Se existir uma conta para este email, enviaremos instruções para redefinir a senha.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      throw resetError;
    }

    console.log("Link de reset gerado com sucesso");

    // Enviar email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [email],
        subject: "Redefinição de Senha - CRM",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Redefinição de Senha</h1>
            <p>Você solicitou a redefinição de senha para sua conta.</p>
            <p>Para redefinir sua senha, clique no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.properties.action_link}" 
                 style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Redefinir Senha
              </a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Se você não solicitou esta redefinição, pode ignorar este email com segurança.
              Este link expira em 24 horas.
            </p>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Erro ao enviar email:", emailData);
      throw new Error(emailData.message || "Erro ao enviar email");
    }

    console.log("Email de reset enviado com sucesso:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email de reset:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  cargo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, cargo }: InviteEmailRequest = await req.json();

    console.log("Enviando convite para:", email);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // NOTA: Por enquanto envia para mironlucas22@gmail.com até o domínio ser verificado
    // Depois que verificar o domínio no Resend, altere o 'from' para usar seu domínio
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: ["mironlucas22@gmail.com"], // Temporariamente enviando só para você até verificar domínio
        subject: `Convite para acessar o CRM - ${email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Convite para ${email}</h1>
            <p>Um convite foi criado para: <strong>${email}</strong></p>
            ${cargo ? `<p><strong>Cargo:</strong> ${cargo}</p>` : ''}
            <p>Para acessar o sistema, clique no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://seu-dominio.com" 
                 style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Acessar CRM
              </a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              NOTA: Este email está sendo enviado para você porque seu domínio ainda não foi verificado no Resend.
              Após verificar o domínio, os emails serão enviados diretamente para ${email}.
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

    console.log("Email enviado com sucesso:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
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

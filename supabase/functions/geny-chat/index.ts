import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ID do Workflow do Agent
const WORKFLOW_ID = "wf_6931ee8c3f9c8190b37bda50ff3cd6290398601714d6060b";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message } = await req.json();
    console.log("Mensagem recebida:", message);

    // Criar sessão ChatKit
    console.log("Criando sessão ChatKit com workflow:", WORKFLOW_ID);
    const sessionResponse = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1"
      },
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        user: "geny-crm-user"
      }),
    });

    const sessionStatus = sessionResponse.status;
    const sessionText = await sessionResponse.text();
    
    console.log("Status da sessão ChatKit:", sessionStatus);
    console.log("Resposta sessão:", sessionText);

    if (!sessionResponse.ok) {
      console.error("Erro ao criar sessão ChatKit:", sessionStatus, sessionText);
      return new Response(JSON.stringify({ 
        error: `Erro ao criar sessão ChatKit: ${sessionStatus}`,
        details: sessionText
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionData = JSON.parse(sessionText);
    const sessionId = sessionData.id;
    console.log("Sessão criada:", sessionId);

    // Enviar mensagem para o ChatKit
    console.log("Enviando mensagem para ChatKit...");
    const messageResponse = await fetch(`https://api.openai.com/v1/chatkit/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1"
      },
      body: JSON.stringify({
        role: "user",
        content: message
      }),
    });

    const messageStatus = messageResponse.status;
    const messageText = await messageResponse.text();
    
    console.log("Status da mensagem:", messageStatus);
    console.log("Resposta da mensagem:", messageText);

    if (!messageResponse.ok) {
      console.error("Erro ao enviar mensagem:", messageStatus, messageText);
      return new Response(JSON.stringify({ 
        error: `Erro ao enviar mensagem: ${messageStatus}`,
        details: messageText
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageData = JSON.parse(messageText);
    
    // Aguardar e buscar a resposta do agent
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const listResponse = await fetch(`https://api.openai.com/v1/chatkit/sessions/${sessionId}/messages`, {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "chatkit_beta=v1"
      },
    });

    const listText = await listResponse.text();
    console.log("Lista de mensagens:", listText);
    
    const listData = JSON.parse(listText);
    const assistantMessage = listData.data?.find((m: any) => m.role === "assistant");
    
    if (!assistantMessage) {
      return new Response(JSON.stringify({ 
        response: "Aguardando resposta do agente...",
        session_id: sessionId,
        messages: listData.data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawContent = assistantMessage.content || "";
    console.log("Resposta raw do agent:", rawContent);

    // Tentar parsear como JSON
    let parsedResponse: { sql?: string; explicacao?: string };
    
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = { explicacao: rawContent };
      }
    } catch (e) {
      console.log("Não foi possível parsear como JSON, usando texto direto");
      parsedResponse = { explicacao: rawContent };
    }

    console.log("Resposta parseada:", JSON.stringify(parsedResponse));

    // Se não tem SQL, retorna a explicação diretamente
    if (!parsedResponse.sql) {
      return new Response(JSON.stringify({ 
        response: parsedResponse.explicacao || "Não consegui gerar uma consulta para essa pergunta.",
        ai_response: parsedResponse,
        raw_response: rawContent
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Executar a query SQL no Supabase
    console.log("Executando SQL:", parsedResponse.sql);
    
    const { data: queryResult, error: queryError } = await supabase.rpc('execute_readonly_query', {
      query_text: parsedResponse.sql
    }).maybeSingle();

    let finalResponse: string;
    let queryData: unknown = null;

    if (queryError) {
      console.error("Erro na query:", queryError);
      finalResponse = `Desculpe, ocorreu um erro ao consultar os dados: ${queryError.message}`;
    } else {
      queryData = queryResult;
      console.log("Resultado da query:", queryResult);
      
      let valor = "0";
      if (queryResult && typeof queryResult === 'object') {
        const values = Object.values(queryResult);
        if (values.length > 0) {
          const rawValue = values[0];
          if (typeof rawValue === 'number') {
            valor = rawValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          } else {
            valor = String(rawValue);
          }
        }
      } else if (queryResult !== null && queryResult !== undefined) {
        valor = String(queryResult);
      }

      finalResponse = (parsedResponse.explicacao || "Resultado: {{valor}}").replace("{{valor}}", valor);
    }

    return new Response(JSON.stringify({ 
      response: finalResponse,
      ai_response: parsedResponse,
      query_result: queryData,
      raw_response: rawContent
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Erro na função geny-chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

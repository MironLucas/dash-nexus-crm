import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ID do Assistant treinado
const ASSISTANT_ID = "asst_" + "wf_6931ee8c3f9c8190b37bda50ff3cd6290398601714d6060b".replace("wf_", "");

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

    // Criar uma thread
    console.log("Criando thread...");
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({}),
    });

    if (!threadResponse.ok) {
      const errorText = await threadResponse.text();
      console.error("Erro ao criar thread:", errorText);
      throw new Error(`Erro ao criar thread: ${errorText}`);
    }

    const thread = await threadResponse.json();
    console.log("Thread criada:", thread.id);

    // Adicionar mensagem à thread
    console.log("Adicionando mensagem à thread...");
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: message
      }),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error("Erro ao adicionar mensagem:", errorText);
      throw new Error(`Erro ao adicionar mensagem: ${errorText}`);
    }

    console.log("Mensagem adicionada com sucesso");

    // Executar o assistant
    console.log("Executando assistant:", ASSISTANT_ID);
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
      }),
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error("Erro ao executar run:", errorText);
      throw new Error(`Erro ao executar run: ${errorText}`);
    }

    let run = await runResponse.json();
    console.log("Run iniciado:", run.id, "Status:", run.status);

    // Aguardar conclusão do run (polling)
    let attempts = 0;
    const maxAttempts = 30;
    
    while (run.status !== "completed" && run.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "OpenAI-Beta": "assistants=v2"
        },
      });
      
      run = await statusResponse.json();
      console.log("Status do run:", run.status, "Tentativa:", attempts + 1);
      attempts++;
    }

    if (run.status !== "completed") {
      throw new Error(`Run não completou. Status: ${run.status}`);
    }

    // Buscar mensagens da thread
    console.log("Buscando mensagens da thread...");
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      },
    });

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data.find((m: any) => m.role === "assistant");
    
    if (!assistantMessage) {
      throw new Error("Nenhuma resposta do assistant encontrada");
    }

    const rawContent = assistantMessage.content[0]?.text?.value || "";
    console.log("Resposta raw do assistant:", rawContent);

    // Tentar parsear como JSON
    let parsedResponse: { sql?: string; explicacao?: string };
    
    try {
      // Tentar extrair JSON do conteúdo (pode vir com markdown)
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
      
      // Substituir {{valor}} pelo resultado
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

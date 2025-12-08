import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ID do Agent/Workflow treinado
const AGENT_WORKFLOW_ID = "wf_6931ee8c3f9c8190b37bda50ff3cd6290398601714d6060b";

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

    // Chamada para o Agent/Workflow da OpenAI
    const agentPayload = {
      workflow_id: AGENT_WORKFLOW_ID,
      input: {
        user_message: message
      }
    };

    console.log("Enviando para OpenAI Agent:", JSON.stringify(agentPayload));
    
    const openaiResponse = await fetch("https://api.openai.com/v1/workflows/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "workflows=v1"
      },
      body: JSON.stringify(agentPayload),
    });

    const responseStatus = openaiResponse.status;
    const responseText = await openaiResponse.text();
    
    console.log("Status da resposta OpenAI:", responseStatus);
    console.log("Resposta raw OpenAI:", responseText);

    if (!openaiResponse.ok) {
      console.error("Erro OpenAI:", responseStatus, responseText);
      return new Response(JSON.stringify({ 
        error: `Erro na API OpenAI: ${responseStatus}`,
        details: responseText,
        debug_payload: agentPayload 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let openaiData;
    try {
      openaiData = JSON.parse(responseText);
    } catch (e) {
      console.error("Erro ao parsear resposta:", e);
      return new Response(JSON.stringify({ 
        error: "Erro ao parsear resposta da OpenAI",
        raw_response: responseText,
        debug_payload: agentPayload 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Resposta do Agent:", JSON.stringify(openaiData));

    // O Agent deve retornar o JSON com sql e explicacao
    let parsedResponse: { sql?: string; explicacao?: string };
    
    // Tentar extrair a resposta do Agent (pode variar dependendo da estrutura)
    const agentOutput = openaiData.output || openaiData.result || openaiData;
    
    if (typeof agentOutput === 'string') {
      try {
        parsedResponse = JSON.parse(agentOutput);
      } catch {
        parsedResponse = { explicacao: agentOutput };
      }
    } else if (agentOutput.sql || agentOutput.explicacao) {
      parsedResponse = agentOutput;
    } else {
      parsedResponse = { explicacao: JSON.stringify(agentOutput) };
    }

    console.log("Resposta parseada:", JSON.stringify(parsedResponse));

    // Se não tem SQL, retorna a explicação diretamente
    if (!parsedResponse.sql) {
      return new Response(JSON.stringify({ 
        response: parsedResponse.explicacao || "Não consegui gerar uma consulta para essa pergunta.",
        debug_payload: agentPayload,
        ai_response: parsedResponse,
        raw_openai_response: openaiData
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
      debug_payload: agentPayload,
      ai_response: parsedResponse,
      query_result: queryData,
      raw_openai_response: openaiData
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

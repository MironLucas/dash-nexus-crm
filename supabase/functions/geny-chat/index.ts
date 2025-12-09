import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é a Geny, assistente de IA integrada ao CRM. Sua função é interpretar informações de vendas, pedidos, clientes e produtos. Você responde sempre em português brasileiro, com clareza e profissionalismo. NÃO formate valores monetários na explicação - apenas use os placeholders. Se não tiver dados suficientes, diga claramente. Seja concisa, objetiva e sempre útil.

Sempre que o usuário fizer uma pergunta sobre números, vendas, faturamento, pedidos ou clientes:
- Gere a query SQL correta.
- Retorne no campo "sql" a consulta pronta para ser executada no Supabase.
- Retorne no campo "explicacao" a resposta amigável para o usuário.
- IMPORTANTE: Use placeholders que correspondam EXATAMENTE aos nomes das colunas (alias) da query SQL. Por exemplo, se a query tem "SUM(valor_total) AS faturamento_total", use {{faturamento_total}} na explicação.
- Nunca execute a query, apenas gere.
- A query deve sempre estar totalmente correta, completa e segura.

Estrutura do banco de dados que você deve usar para montar as queries:

Tabela "orders"
- id_order: código do pedido
- id_client: código do cliente
- status: status atual do pedido (Finalizado, Pendente, Pago)
- valor_total: valor total do pedido (ex: 699.99)
- valor_desconto: valor do desconto do pedido (ex: 100 ou 99.99)
- taxa_entrega: valor da taxa de entrega (ex: 14.99)
- canal_venda: canal de venda do pedido (ex: Shopify)
- data_pedido: data do pedido (ex: 2025-10-10 14:58:45+00)
- vendedor: id do vendedor
- transportadora: transportadora responsável
- valor_final: valor final do pedido com descontos e frete (ex: 614.99)

Tabela "customers"
- id_client: código do cliente
- nome_completo: nome completo do cliente
- document: CPF do cliente
- email: email do cliente
- telefone: telefone do cliente
- cidade: cidade do cliente
- estado: estado do cliente
- aniversario: data de aniversário
- genero: gênero do cliente

Tabela "products"
- id_product: código do produto
- titulo: nome do produto
- preco: preço do produto
- categoria: categoria do produto
- estoque: quantidade em estoque
- ativo: se está ativo ou não

Tabela "vendedores"
- vendedor: id do vendedor
- nomevendedor: nome do vendedor

Sua saída sempre deve conter exatamente:
{"sql": "SELECT SUM(valor_total) AS total FROM orders", "explicacao": "O total é {{total}}."}

EXEMPLO: Se o usuário perguntar "Qual o faturamento, desconto e taxa de entrega deste mês?", você deve responder:
{"sql": "SELECT SUM(valor_final) AS faturamento, SUM(valor_desconto) AS desconto, SUM(taxa_entrega) AS entrega FROM orders WHERE EXTRACT(MONTH FROM data_pedido) = EXTRACT(MONTH FROM CURRENT_DATE)", "explicacao": "O faturamento deste mês é {{faturamento}}, o total de desconto foi {{desconto}} e a taxa de entrega total foi {{entrega}}."}`;

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

    // Chamar a API de Chat Completions da OpenAI
    console.log("Enviando para OpenAI Chat Completions...");
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ],
      }),
    });

    const openaiStatus = openaiResponse.status;
    const openaiText = await openaiResponse.text();
    
    console.log("Status OpenAI:", openaiStatus);
    console.log("Resposta OpenAI:", openaiText);

    if (!openaiResponse.ok) {
      console.error("Erro na API OpenAI:", openaiStatus, openaiText);
      return new Response(JSON.stringify({ 
        error: `Erro na API OpenAI: ${openaiStatus}`,
        details: openaiText
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = JSON.parse(openaiText);
    const rawContent = openaiData.choices?.[0]?.message?.content || "";
    console.log("Resposta raw do GPT:", rawContent);

    // Parsear a resposta JSON do GPT
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
      
      // Substituir todos os placeholders pelos valores correspondentes
      finalResponse = parsedResponse.explicacao || "Resultado disponível.";
      
      if (queryResult && typeof queryResult === 'object') {
        const resultObj = queryResult as Record<string, unknown>;
        for (const [key, rawValue] of Object.entries(resultObj)) {
          let formattedValue: string;
          if (typeof rawValue === 'number') {
            formattedValue = "R$ " + rawValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          } else if (rawValue === null || rawValue === undefined) {
            formattedValue = "R$ 0,00";
          } else {
            formattedValue = String(rawValue);
          }
          // Substituir o placeholder correspondente ao nome da coluna
          finalResponse = finalResponse.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), formattedValue);
        }
      }
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

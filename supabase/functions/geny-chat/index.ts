import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schema do banco para o prompt
const DATABASE_SCHEMA = `
Você é um assistente de IA especializado em gerar consultas SQL para um CRM.

SCHEMA DO BANCO DE DADOS:

Tabela: orders
- id_order (bigint, PK)
- id_client (bigint, FK para customers)
- vendedor (bigint, FK para vendedores)
- data_pedido (timestamp with time zone)
- status (varchar) - valores possíveis: 'pago', 'finalizado', 'pendente', 'cancelado'
- valor_total (numeric)
- valor_desconto (bigint)
- valor_final (numeric)
- taxa_entrega (numeric)
- canal_venda (varchar)
- transportadora (varchar)

Tabela: customers
- id_client (bigint, PK)
- nome_completo (varchar)
- email (varchar)
- telefone (varchar)
- document (varchar) - CPF/CNPJ
- aniversario (date)
- genero (varchar)
- logadouro, numero, complemento, bairro, cidade, estado, cep (varchar) - endereço

Tabela: products
- id_product (bigint, PK)
- titulo (varchar)
- descricao (varchar)
- sku (varchar)
- categoria (varchar)
- preco (numeric)
- estoque (varchar)
- ativo (varchar)

Tabela: itens (itens dos pedidos)
- id_itens (bigint, PK)
- id_order (bigint, FK para orders)
- id_product (bigint, FK para products)
- product_total (numeric)
- product_desc (numeric)
- product_final (numeric)
- variante1, variante2 (varchar)

Tabela: vendedores
- vendedor (bigint, PK)
- nomevendedor (varchar)

REGRAS:
1. Sempre retorne um JSON válido com as chaves "sql" e "explicacao"
2. A query SQL deve ser compatível com PostgreSQL
3. Use apenas SELECT, nunca INSERT, UPDATE, DELETE ou DROP
4. Para faturamento, use valor_final da tabela orders
5. Para pedidos pagos/finalizados, filtre por status IN ('pago', 'finalizado')
6. Use DATE_TRUNC para agrupar por período
7. Use COALESCE para evitar NULL em somas
8. Na explicacao, use {{valor}} onde o resultado da query deve aparecer
9. Se a pergunta não for relacionada ao CRM, retorne uma mensagem educada

Exemplo de resposta:
{"sql":"SELECT COALESCE(SUM(valor_final), 0) AS resultado FROM orders WHERE DATE_TRUNC('month', data_pedido) = DATE_TRUNC('month', CURRENT_DATE)","explicacao":"O faturamento deste mês é de R$ {{valor}}."}
`;

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

    // Passo 1: Enviar para o ChatGPT para gerar o SQL
    const openaiPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: DATABASE_SCHEMA,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    };

    console.log("Enviando para OpenAI...");
    
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("Erro OpenAI:", openaiResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `Erro na API OpenAI: ${openaiResponse.status}`,
        debug_payload: openaiPayload 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiResponse.json();
    const aiResponseText = openaiData.choices[0]?.message?.content || "{}";
    
    console.log("Resposta da IA:", aiResponseText);

    // Passo 2: Parsear a resposta JSON
    let parsedResponse: { sql?: string; explicacao?: string };
    try {
      parsedResponse = JSON.parse(aiResponseText);
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError);
      return new Response(JSON.stringify({ 
        response: "Desculpe, não consegui processar sua solicitação. Tente reformular a pergunta.",
        debug_payload: openaiPayload,
        ai_response: aiResponseText
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se não tem SQL, retorna a explicação diretamente
    if (!parsedResponse.sql) {
      return new Response(JSON.stringify({ 
        response: parsedResponse.explicacao || "Não consegui gerar uma consulta para essa pergunta.",
        debug_payload: openaiPayload,
        ai_response: parsedResponse
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Passo 3: Executar a query SQL no Supabase
    console.log("Executando SQL:", parsedResponse.sql);
    
    const { data: queryResult, error: queryError } = await supabase.rpc('execute_readonly_query', {
      query_text: parsedResponse.sql
    }).maybeSingle();

    let finalResponse: string;
    let queryData: unknown = null;

    if (queryError) {
      console.error("Erro na query:", queryError);
      // Tentar executar diretamente se a função RPC não existir
      // Usando uma abordagem alternativa com consulta direta
      try {
        const { data: directResult, error: directError } = await supabase
          .from('orders')
          .select('*')
          .limit(1);
        
        if (directError) {
          finalResponse = `Desculpe, ocorreu um erro ao consultar os dados: ${queryError.message}`;
        } else {
          // A função RPC não existe, vamos precisar criar ou usar outra abordagem
          finalResponse = `A consulta foi gerada mas não foi possível executá-la automaticamente. SQL gerado: ${parsedResponse.sql}`;
        }
      } catch (e) {
        finalResponse = `Erro ao executar consulta: ${queryError.message}`;
      }
    } else {
      queryData = queryResult;
      console.log("Resultado da query:", queryResult);
      
      // Passo 4: Substituir {{valor}} pelo resultado
      let valor = "0";
      if (queryResult && typeof queryResult === 'object') {
        // Pega o primeiro valor do resultado
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
      debug_payload: openaiPayload,
      ai_response: parsedResponse,
      query_result: queryData
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

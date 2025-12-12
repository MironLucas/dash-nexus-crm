import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_SYSTEM_PROMPT = `Você é a Geny, assistente de IA integrada ao CRM. Sua função é interpretar informações de vendas, pedidos, clientes e produtos. Você responde sempre em português brasileiro, com clareza e profissionalismo. NÃO formate valores monetários na explicação - apenas use os placeholders. Se não tiver dados suficientes, diga claramente. Seja concisa, objetiva e sempre útil.

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

async function getSystemPrompt(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('Supabase credentials not found, using default prompt');
      return DEFAULT_SYSTEM_PROMPT;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'geny_prompt')
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching prompt from database:', error);
      return DEFAULT_SYSTEM_PROMPT;
    }
    
    if (data?.value) {
      console.log('Using custom prompt from database');
      return data.value;
    }
    
    console.log('No custom prompt found, using default');
    return DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.error('Error in getSystemPrompt:', err);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    // Buscar o prompt do banco de dados
    const systemPrompt = await getSystemPrompt();

    // Chamar OpenAI para gerar SQL
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
      }),
    });

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response:', JSON.stringify(openAIData, null, 2));

    if (!openAIData.choices || !openAIData.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }

    const aiContent = openAIData.choices[0].message.content;
    console.log('AI content:', aiContent);

    // Tentar parsear a resposta como JSON
    let parsedResponse;
    try {
      // Limpar possíveis caracteres extras
      const cleanContent = aiContent.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(JSON.stringify({ 
        response: aiContent,
        error: 'Não foi possível processar a resposta como JSON'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se temos SQL, executar a query
    if (parsedResponse.sql) {
      console.log('Executing SQL:', parsedResponse.sql);
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase credentials not configured');
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: queryResult, error: queryError } = await supabase.rpc('execute_readonly_query', {
        query_text: parsedResponse.sql
      });

      console.log('Query result:', JSON.stringify(queryResult, null, 2));
      console.log('Query error:', queryError);

      if (queryError) {
        return new Response(JSON.stringify({ 
          response: `Erro ao executar a consulta: ${queryError.message}`,
          sql: parsedResponse.sql
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Substituir TODOS os placeholders dinamicamente
      let finalResponse = parsedResponse.explicacao;
      
      if (queryResult) {
        // Se é um array com múltiplos resultados
        if (Array.isArray(queryResult) && queryResult.length > 0) {
          // Para cada placeholder encontrado, extrair o valor correspondente de todos os registros
          const placeholderRegex = /\{\{(\w+)\}\}/g;
          const placeholders = [...finalResponse.matchAll(placeholderRegex)];
          
          for (const match of placeholders) {
            const placeholder = match[0]; // {{nomevendedor}}
            const key = match[1]; // nomevendedor
            
            // Coletar todos os valores dessa coluna de todos os registros
            const values = queryResult
              .map((row: any) => row[key])
              .filter((v: any) => v !== null && v !== undefined)
              .map((v: any) => String(v));
            
            // Juntar os valores com vírgula ou usar formato adequado
            const formattedValue = values.length > 0 ? values.join(', ') : '0';
            
            // Substituir todas as ocorrências do placeholder
            finalResponse = finalResponse.split(placeholder).join(formattedValue);
          }
        } 
        // Se é um objeto único
        else if (typeof queryResult === 'object' && !Array.isArray(queryResult)) {
          for (const [key, value] of Object.entries(queryResult)) {
            const placeholder = `{{${key}}}`;
            let formattedValue: string;
            
            if (value === null || value === undefined) {
              formattedValue = '0';
            } else {
              formattedValue = String(value);
            }
            
            finalResponse = finalResponse.split(placeholder).join(formattedValue);
          }
        }
      }

      console.log('Final response:', finalResponse);

      return new Response(JSON.stringify({ 
        response: finalResponse,
        sql: parsedResponse.sql,
        rawResult: queryResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se não tem SQL, retornar a explicação diretamente
    return new Response(JSON.stringify({ 
      response: parsedResponse.explicacao || aiContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in geny-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Buscar dados do CRM para contexto
    const [ordersResult, customersResult, productsResult, vendedoresResult] = await Promise.all([
      supabase.from("orders").select("*").order("data_pedido", { ascending: false }).limit(100),
      supabase.from("customers").select("*").limit(100),
      supabase.from("products").select("*").limit(100),
      supabase.from("vendedores").select("*"),
    ]);

    // Calcular estatísticas
    const orders = ordersResult.data || [];
    const customers = customersResult.data || [];
    const products = productsResult.data || [];
    const vendedores = vendedoresResult.data || [];

    const hoje = new Date().toISOString().split("T")[0];
    const pedidosHoje = orders.filter((o) => o.data_pedido?.startsWith(hoje));
    const faturamentoHoje = pedidosHoje.reduce((acc, o) => acc + (o.valor_final || 0), 0);
    
    const mesAtual = new Date().toISOString().slice(0, 7);
    const pedidosMes = orders.filter((o) => o.data_pedido?.startsWith(mesAtual));
    const faturamentoMes = pedidosMes.reduce((acc, o) => acc + (o.valor_final || 0), 0);

    const faturamentoTotal = orders.reduce((acc, o) => acc + (o.valor_final || 0), 0);

    // Estatísticas por vendedor
    const estatisticasVendedores = vendedores.map((v) => {
      const pedidosVendedor = orders.filter((o) => o.vendedor === v.vendedor);
      const faturamento = pedidosVendedor.reduce((acc, o) => acc + (o.valor_final || 0), 0);
      return {
        nome: v.nomevendedor,
        id: v.vendedor,
        totalPedidos: pedidosVendedor.length,
        faturamento,
      };
    });

    // Produtos mais vendidos (simplificado)
    const produtosInfo = products.map((p) => ({
      titulo: p.titulo,
      preco: p.preco,
      categoria: p.categoria,
      estoque: p.estoque,
    }));

    const contextData = `
DADOS DO CRM (Atualizado em ${new Date().toLocaleString("pt-BR")}):

RESUMO GERAL:
- Total de pedidos: ${orders.length}
- Total de clientes: ${customers.length}
- Total de produtos: ${products.length}
- Total de vendedores: ${vendedores.length}

FATURAMENTO:
- Faturamento hoje (${hoje}): R$ ${faturamentoHoje.toFixed(2)}
- Pedidos hoje: ${pedidosHoje.length}
- Faturamento do mês (${mesAtual}): R$ ${faturamentoMes.toFixed(2)}
- Pedidos do mês: ${pedidosMes.length}
- Faturamento total: R$ ${faturamentoTotal.toFixed(2)}

VENDEDORES E PERFORMANCE:
${estatisticasVendedores.map((v) => `- ${v.nome || "Vendedor " + v.id}: ${v.totalPedidos} pedidos, R$ ${v.faturamento.toFixed(2)}`).join("\n")}

ÚLTIMOS 5 PEDIDOS:
${orders.slice(0, 5).map((o) => `- Pedido #${o.id_order}: R$ ${o.valor_final?.toFixed(2) || "0.00"} - ${o.status || "N/A"} - ${o.data_pedido || "Sem data"}`).join("\n")}

PRODUTOS CADASTRADOS (amostra):
${produtosInfo.slice(0, 10).map((p) => `- ${p.titulo}: R$ ${p.preco?.toFixed(2) || "0.00"} (${p.categoria || "Sem categoria"})`).join("\n")}
`;

    console.log("Contexto preparado, enviando para OpenAI...");

    const openaiPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é a Geny, uma assistente de IA integrada ao CRM. Você ajuda os usuários a entender dados de vendas, pedidos, clientes e performance.

Suas características:
- Seja sempre educada e profissional
- Responda em português brasileiro
- Use os dados fornecidos para responder perguntas
- Formate valores monetários em Reais (R$)
- Se não souber algo específico, diga que não tem essa informação disponível
- Seja concisa mas completa nas respostas

${contextData}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro OpenAI:", response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";

    console.log("Resposta da IA:", aiResponse.substring(0, 100) + "...");

    return new Response(JSON.stringify({ 
      response: aiResponse,
      debug_payload: openaiPayload 
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

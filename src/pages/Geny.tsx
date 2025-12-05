import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface DebugInfo {
  payload?: unknown;
  aiResponse?: unknown;
  queryResult?: unknown;
}

const Geny = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Eu sou a Geny, sua assistente de IA integrada ao CRM. Posso ajudá-lo a consultar informações sobre vendas, clientes, pedidos e muito mais. Como posso ajudar?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isPayloadOpen, setIsPayloadOpen] = useState(true);
  const [isAiResponseOpen, setIsAiResponseOpen] = useState(true);
  const [isQueryResultOpen, setIsQueryResultOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setDebugInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke("geny-chat", {
        body: { message: input.trim() },
      });

      // Sempre salvar info de debug
      if (data) {
        setDebugInfo({
          payload: data.debug_payload,
          aiResponse: data.ai_response,
          queryResult: data.query_result,
        });
      }

      if (error) throw error;

      // Se há erro da OpenAI mas temos o payload
      if (data?.error) {
        toast({
          title: "Erro da API",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Desculpe, não consegui processar sua solicitação.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível processar sua mensagem.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Geny</h1>
        <p className="text-muted-foreground">Assistente de IA integrada ao CRM</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat */}
        <Card className="flex flex-col h-[600px] bg-gradient-to-b from-muted/30 to-muted/10">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card text-card-foreground border rounded-bl-sm shadow-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span
                      className={`text-[10px] mt-1 block ${
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card text-card-foreground border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Debug Info */}
        <Card className="flex flex-col h-[600px] p-4">
          <h3 className="text-sm font-semibold mb-4">Debug Info</h3>
          <ScrollArea className="flex-1">
            {debugInfo ? (
              <div className="space-y-4 pr-4">
                {/* Payload enviado para OpenAI */}
                <Collapsible open={isPayloadOpen} onOpenChange={setIsPayloadOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full">
                    {isPayloadOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    1. Payload enviado para OpenAI
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                      {JSON.stringify(debugInfo.payload, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>

                {/* Resposta da IA (SQL + explicação) */}
                <Collapsible open={isAiResponseOpen} onOpenChange={setIsAiResponseOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full">
                    {isAiResponseOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    2. Resposta da IA (SQL gerado)
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(debugInfo.aiResponse, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>

                {/* Resultado da Query */}
                <Collapsible open={isQueryResultOpen} onOpenChange={setIsQueryResultOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full">
                    {isQueryResultOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    3. Resultado da Query SQL
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {debugInfo.queryResult !== undefined 
                        ? JSON.stringify(debugInfo.queryResult, null, 2) 
                        : "Nenhum resultado (query não executada ou erro)"}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">
                  Envie uma mensagem para ver as informações de debug
                </p>
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default Geny;

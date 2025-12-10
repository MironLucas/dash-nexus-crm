import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Key, MessageSquare, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Configuracoes = () => {
  const [role, setRole] = useState<string | null>(null);
  const [genyPrompt, setGenyPrompt] = useState<string>("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');
        setRole(!roleError ? ((roleData as string) || null) : null);
      }
    };
    loadRole();
  }, []);

  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'geny_prompt')
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar prompt:', error);
          toast.error('Erro ao carregar o prompt');
        } else if (data?.value) {
          setGenyPrompt(data.value);
        }
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoadingPrompt(false);
      }
    };

    if (role === 'admin') {
      loadPrompt();
    } else {
      setLoadingPrompt(false);
    }
  }, [role]);

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: genyPrompt })
        .eq('key', 'geny_prompt');

      if (error) {
        console.error('Erro ao salvar prompt:', error);
        toast.error('Erro ao salvar o prompt');
      } else {
        toast.success('Prompt salvo com sucesso!');
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao salvar o prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  if (role === 'vendedor') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acesso negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar Configurações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Nome da Empresa</Label>
              <Input id="company" placeholder="Sua Empresa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="contato@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="(00) 0000-0000" />
            </div>
            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Chave API IA (Geny)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A chave da API do ChatGPT é usada para alimentar a assistente Geny.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Configurada
              </Badge>
              <span className="text-sm text-muted-foreground">
                A chave está armazenada de forma segura no servidor.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar a chave, acesse as configurações de secrets do Supabase.
            </p>
          </CardContent>
        </Card>

        {role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Prompt da Geny
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure o prompt que será enviado para o ChatGPT quando a Geny processar suas perguntas. 
                Este prompt define como a IA deve interpretar e responder às consultas.
              </p>
              {loadingPrompt ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="geny-prompt">Prompt do Sistema</Label>
                    <Textarea
                      id="geny-prompt"
                      value={genyPrompt}
                      onChange={(e) => setGenyPrompt(e.target.value)}
                      placeholder="Digite o prompt do sistema..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                  <Button 
                    onClick={handleSavePrompt} 
                    disabled={savingPrompt}
                    className="flex items-center gap-2"
                  >
                    {savingPrompt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar Prompt
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Conexão com Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Configure a conexão com seu projeto Supabase existente para sincronizar os dados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracoes;

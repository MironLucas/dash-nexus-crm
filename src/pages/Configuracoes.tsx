import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Key, MessageSquare, Save, Loader2, Image, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import defaultLogo from "@/assets/logo.png";

const Configuracoes = () => {
  const [role, setRole] = useState<string | null>(null);
  const [genyPrompt, setGenyPrompt] = useState<string>("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const loadLogo = async () => {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'company_logo')
        .maybeSingle();
      if (data?.value) {
        setLogoUrl(data.value);
      }
    };

    if (role === 'admin') {
      loadPrompt();
      loadLogo();
    } else {
      setLoadingPrompt(false);
    }
  }, [role]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const { error: configError } = await supabase
        .from('system_config')
        .upsert({ key: 'company_logo', value: publicUrl }, { onConflict: 'key' });

      if (configError) throw configError;

      setLogoUrl(publicUrl);
      toast.success('Logo atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      toast.error('Erro ao fazer upload da logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await supabase
        .from('system_config')
        .delete()
        .eq('key', 'company_logo');
      setLogoUrl(null);
      toast.success('Logo removida. Usando logo padrão.');
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao remover logo');
    }
  };

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
                <Image className="h-5 w-5" />
                Logo da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Altere a logo exibida no menu lateral do sistema.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg border border-border flex items-center justify-center bg-muted overflow-hidden">
                  <img 
                    src={logoUrl || defaultLogo} 
                    alt="Logo atual" 
                    className="h-16 w-16 object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {logoUrl ? 'Alterar Logo' : 'Upload Logo'}
                  </Button>
                  {logoUrl && (
                    <Button
                      variant="ghost"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover Logo
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

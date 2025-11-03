import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CompletarCadastro = () => {
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se há um token na URL (vindo do email de convite)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (accessToken && type === 'invite') {
      // Usar o token para obter os dados do usuário
      supabase.auth.getUser(accessToken).then(({ data, error }) => {
        if (error || !data.user) {
          toast({
            variant: "destructive",
            title: "Link inválido",
            description: "Este link de convite é inválido ou expirou.",
          });
          navigate('/login');
          return;
        }
        setUserData(data.user);
      });
    } else {
      // Se não há token, redirecionar para login
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa de um convite para acessar esta página.",
      });
      navigate('/login');
    }
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (senha !== confirmarSenha) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
      });
      return;
    }

    if (senha.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    try {
      setLoading(true);

      // Atualizar a senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
        data: {
          ...userData?.user_metadata,
          telefone: telefone
        }
      });

      if (updateError) throw updateError;

      // Atualizar o perfil com o telefone
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userData?.id,
          telefone: telefone
        });

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
        // Não falha o cadastro se não conseguir atualizar o perfil
      }

      toast({
        title: "Cadastro concluído!",
        description: "Sua conta foi configurada com sucesso.",
      });

      // Fazer login automaticamente
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData?.email,
        password: senha,
      });

      if (signInError) throw signInError;

      navigate('/');
    } catch (error: any) {
      console.error("Erro ao completar cadastro:", error);
      toast({
        variant: "destructive",
        title: "Erro ao completar cadastro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete seu Cadastro</CardTitle>
          <CardDescription>
            Olá, {userData?.user_metadata?.nome}! Complete suas informações para começar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userData?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                type="text"
                value={userData?.user_metadata?.cargo === 'admin' ? 'Administrador' : 
                       userData?.user_metadata?.cargo === 'gerente' ? 'Gerente' : 'Vendedor'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Completar Cadastro"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletarCadastro;
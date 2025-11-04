import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfileProps {
  isCollapsed?: boolean;
}

export function UserProfile({ isCollapsed = false }: UserProfileProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      // Buscar perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setNome(profile.nome || "");
        setAvatarUrl(profile.avatar_url || "");
      }

      // Buscar cargo da tabela users
      if (user.email) {
        const response = await fetch(
          `https://jckwavzrpyczdkbwxnqb.supabase.co/rest/v1/users?emailuser=eq.${encodeURIComponent(user.email)}&select=cargo`,
          {
            headers: {
              apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3dhdnpycHljemRrYnd4bnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU1MTcsImV4cCI6MjA3NTYwMTUxN30.JrEwf_IP-eeO194tKAxe6fp-1ZQH80D1oL4PRF4pl_c",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          }
        );
        const data = await response.json();
        setCargo(data?.[0]?.cargo || "");
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('profiles')
        .update({ nome })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado!",
        description: "Verifique seu email para redefinir sua senha.",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getInitials = () => {
    if (nome) {
      return nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2 py-6 hover:bg-sidebar-accent"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={nome || email} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-medium truncate w-full">{nome || "Usuário"}</span>
              <span className="text-xs text-muted-foreground truncate w-full">{cargo || "Sem cargo"}</span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>
            Gerencie suas informações pessoais e configurações de conta.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} alt={nome || email} />
              <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar foto"}
                </div>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" value={cargo} disabled />
          </div>

          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir Senha"}
          </Button>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
          <Button onClick={handleUpdateProfile} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
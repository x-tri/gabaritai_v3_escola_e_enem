import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProfileModal({ open, onClose, onSuccess }: EditProfileModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setName(profile.name);
      setError(null);
      setSuccess(false);
    }
  }, [profile, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError('O nome é obrigatório');
      return;
    }

    if (name.trim().length < 3) {
      setError('O nome deve ter pelo menos 3 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar perfil');
      }

      setSuccess(true);

      // Atualizar o perfil no contexto
      if (refreshProfile) {
        await refreshProfile();
      }

      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) return null;

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    school_admin: 'Coordenador',
    student: 'Aluno',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meu Perfil
          </DialogTitle>
          <DialogDescription>
            Visualize e edite suas informações pessoais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Perfil atualizado com sucesso!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Tipo de Conta</Label>
            <Input
              id="role"
              value={roleLabels[profile.role] || profile.role}
              disabled
              className="bg-muted"
            />
          </div>

          {profile.student_number && (
            <div className="space-y-2">
              <Label htmlFor="student_number">Matrícula</Label>
              <Input
                id="student_number"
                value={profile.student_number}
                disabled
                className="bg-muted font-mono"
              />
            </div>
          )}

          {profile.turma && (
            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              <Input
                id="turma"
                value={profile.turma}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || name.trim() === profile.name}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

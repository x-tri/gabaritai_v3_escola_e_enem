import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);

  const isEmail = identifier.includes('@');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let emailToUse = identifier;

    // Se for matrícula, buscar email
    if (!isEmail) {
      try {
        const response = await fetch(`/api/auth/email-by-matricula/${encodeURIComponent(identifier)}`);
        const data = await response.json();

        if (!response.ok || !data.email) {
          toast({
            title: 'Matrícula não encontrada',
            description: 'Verifique se digitou corretamente ou fale com o administrador.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        emailToUse = data.email;
      } catch {
        toast({
          title: 'Erro de conexão',
          description: 'Não foi possível verificar a matrícula.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    // Enviar email de recuperação
    const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSent(true);
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada (e spam).',
      });
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <CardTitle>Email Enviado!</CardTitle>
            <CardDescription>
              Se o email/matrícula estiver cadastrado, você receberá um link para redefinir sua senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Digite sua matrícula ou email para receber um link de recuperação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Matrícula ou Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="12345 ou aluno@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Link de Recuperação'
              )}
            </Button>

            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

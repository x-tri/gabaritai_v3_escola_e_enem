import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@shared/database.types';

// Mapeamento de roles para rotas
function getRedirectByRole(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/';
    case 'school_admin':
      return '/escola';
    case 'student':
      return '/dashboard';
    default:
      return '/';
  }
}

// Componente de bolhas decorativas (remetem aos círculos de gabarito OMR)
function DecorativeBubbles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Bolhas grandes - canto superior direito */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-32 -right-10 w-32 h-32 rounded-full bg-white/10" />

      {/* Bolhas médias - canto inferior esquerdo */}
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-40 left-20 w-20 h-20 rounded-full bg-white/10" />

      {/* Grade de mini-bolhas (simula gabarito) */}
      <div className="absolute top-1/4 left-10 grid grid-cols-5 gap-2 opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 border-white/50 ${i % 4 === 0 ? 'bg-white/30' : ''}`}
          />
        ))}
      </div>

      {/* Grade de mini-bolhas direita */}
      <div className="absolute bottom-1/4 right-10 grid grid-cols-5 gap-2 opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 border-white/50 ${i % 3 === 1 ? 'bg-white/30' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { signIn, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Animação de entrada
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detecta se é email (contém @) ou matrícula
  const isEmail = identifier.includes('@');

  // Redirecionar quando profile carregar após login
  useEffect(() => {
    if (loginSuccess && profile) {
      const redirectPath = getRedirectByRole(profile.role);
      setLocation(redirectPath);
    }
  }, [loginSuccess, profile, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let emailToUse = identifier;

    // Se não for email, buscar email pela matrícula
    if (!isEmail) {
      try {
        const response = await fetch(`/api/auth/email-by-matricula/${encodeURIComponent(identifier)}`);
        const data = await response.json();

        if (!response.ok || !data.email) {
          toast({
            title: 'Matrícula não encontrada',
            description: data.error || 'Não foi possível encontrar um aluno com essa matrícula.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        emailToUse = data.email;
      } catch {
        toast({
          title: 'Erro de conexão',
          description: 'Não foi possível verificar a matrícula. Tente novamente.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    const { error } = await signIn(emailToUse, password);

    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = isEmail
          ? 'Email ou senha incorretos'
          : 'Matrícula encontrada, mas a senha está incorreta';
      }

      toast({
        title: 'Erro ao entrar',
        description: errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      toast({ title: 'Bem-vindo!' });
      setLoginSuccess(true);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Fundo gradiente XTRI */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, #1a2744 0%, #1E9FCC 50%, #33B5E5 100%)`,
        }}
      />

      {/* Overlay com padrão sutil */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(242,106,75,0.15) 0%, transparent 50%)`,
        }}
      />

      {/* Bolhas decorativas */}
      <DecorativeBubbles />

      {/* Card principal */}
      <div
        className={`relative w-full max-w-md transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Card com glassmorphism */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header com gradiente accent */}
          <div
            className="px-8 pt-8 pb-6 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(51,181,229,0.08) 0%, transparent 100%)',
            }}
          >
            {/* Logo XTRI */}
            <div className="mb-4 flex justify-center">
              <img
                src="/favicon.png"
                alt="XTRI Logo"
                className="w-20 h-20 object-contain drop-shadow-lg"
              />
            </div>

            {/* Título com tipografia impactante */}
            <h1
              className="text-3xl font-black tracking-tight mb-1"
              style={{ color: '#1a2744' }}
            >
              XTRI<span style={{ color: '#F26A4B' }}>.</span>
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Gabaritos Inteligentes
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            {/* Campo de identificação */}
            <div className="space-y-2">
              <Label
                htmlFor="identifier"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                {isEmail ? 'Email' : 'Matrícula'}
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#33B5E5] transition-colors">
                  {isEmail ? <Mail className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Digite sua matrícula ou email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-12 h-12 text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-[#33B5E5] focus:ring-[#33B5E5]/20 transition-all"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isEmail ? 'bg-[#33B5E5]' : 'bg-[#F26A4B]'}`} />
                {isEmail ? 'Entrando como coordenador' : 'Entrando como aluno'}
              </p>
            </div>

            {/* Campo de senha */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Senha
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#33B5E5] transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-12 text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-[#33B5E5] focus:ring-[#33B5E5]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Botão de login */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: loading
                  ? '#ccc'
                  : 'linear-gradient(135deg, #F26A4B 0%, #E04E2D 100%)',
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            {/* Link esqueceu senha */}
            <div className="text-center pt-2">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-500 hover:text-[#33B5E5] transition-colors font-medium"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/80 text-sm mt-6 font-medium tracking-wide">
          Transformamos <span className="text-[#F26A4B] font-bold">DADOS</span> em aprovações
        </p>
      </div>
    </div>
  );
}

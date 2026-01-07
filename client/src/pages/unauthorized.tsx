import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@shared/database.types';

// Retorna a rota correta baseada no role
function getHomeByRole(role: UserRole | undefined): string {
  switch (role) {
    case 'super_admin':
      return '/';
    case 'school_admin':
      return '/escola';
    case 'student':
      return '/dashboard';
    default:
      return '/login';
  }
}

export default function UnauthorizedPage() {
  const { profile, signOut } = useAuth();
  const homePath = getHomeByRole(profile?.role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <ShieldX className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href={homePath}>
            <Button className="w-full">Ir para minha página</Button>
          </Link>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sair e trocar de conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

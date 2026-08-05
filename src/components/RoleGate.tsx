/**
 * RoleGate - Guard centralizado de roles
 * 
 * Decide si el usuario ve el árbol /soberania o /aprendizaje basándose
 * en el rol resuelto contra academy_members.
 * 
 * UN ÚNICO PUNTO de lógica de guard de rol.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';

export type UserRole = 'guest' | 'student' | 'tutor' | 'owner' | 'platform_admin';

interface RoleGateProps {
  children: React.ReactNode;
}

/**
 * Determina el rol del usuario:
 * - platform_admin: puede ver /soberania/* (toda la plataforma)
 * - owner: puede ver /soberania/centro/* (su academia) y /aprendizaje/*
 * - tutor: puede ver /soberania/centro/* (su academia) y /aprendizaje/*
 * - student: solo puede ver /aprendizaje/*
 * - guest: solo puede ver rutas públicas
 */
export function useUserRole(): {
  role: UserRole;
  academyRole: string | null;
  academySlug: string | null;
  loading: boolean;
  isAuthenticated: boolean;
} {
  const [role, setRole] = useState<UserRole>('guest');
  const [academyRole, setAcademyRole] = useState<string | null>(null);
  const [academySlug, setAcademySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        // 1. Verificar si es platform admin
        const { data: platformData } = await supabase.rpc('is_platform_admin');
        if (platformData === true) {
          setRole('platform_admin');
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // 2. Obtener sesión
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setRole('guest');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        setIsAuthenticated(true);

        // 3. Obtener academias del usuario
        const { data: academiesData } = await supabase.functions.invoke('list-academies');
        const userAcademies = (academiesData?.academies || []).filter(
          (a: any) => a.is_member
        );

        if (userAcademies.length === 0) {
          setRole('student'); // Autenticado pero sin academias
          setLoading(false);
          return;
        }

        // 4. Determinar rol basado en membresías
        const hasOwner = userAcademies.some((a: any) => a.role === 'owner');
        const hasTutor = userAcademies.some((a: any) => a.role === 'tutor');
        const hasAdmin = userAcademies.some((a: any) => a.role === 'admin');
        
        // Prioridad: owner > tutor > admin > student
        if (hasOwner) {
          const ownerAcademy = userAcademies.find((a: any) => a.role === 'owner');
          setRole('owner');
          setAcademyRole('owner');
          setAcademySlug(ownerAcademy?.slug || null);
        } else if (hasTutor) {
          const tutorAcademy = userAcademies.find((a: any) => a.role === 'tutor');
          setRole('tutor');
          setAcademyRole('tutor');
          setAcademySlug(tutorAcademy?.slug || null);
        } else if (hasAdmin) {
          const adminAcademy = userAcademies.find((a: any) => a.role === 'admin');
          setRole('tutor'); // admin se trata como tutor para efectos de acceso
          setAcademyRole('admin');
          setAcademySlug(adminAcademy?.slug || null);
        } else {
          setRole('student');
          setAcademyRole(userAcademies[0]?.role || 'member');
          setAcademySlug(userAcademies[0]?.slug || null);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking role:', error);
        setRole('guest');
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    checkRole();

    // Re-check on auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { role, academyRole, academySlug, loading, isAuthenticated };
}

/**
 * Componente RoleGate - Wrapper que redirige basándose en el rol
 */
export function RoleGate({ children }: RoleGateProps) {
  const { role, loading, isAuthenticated } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // Si está en / y tiene un rol definido, redirigir según corresponda
    if (location.pathname === '/') {
      if (role === 'platform_admin' || role === 'owner' || role === 'tutor') {
        // Redirigir a Soberanía Admin
        navigate('/soberania', { replace: true });
      } else if (role === 'student' && isAuthenticated) {
        // Redirigir a Aprendizaje
        navigate('/aprendizaje', { replace: true });
      }
      // guest se queda en /
    }
  }, [role, loading, navigate, location.pathname, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Helper para verificar si el usuario puede acceder a rutas de administración
 */
export function canAccessAdmin(role: UserRole): boolean {
  return role === 'platform_admin' || role === 'owner' || role === 'tutor';
}

/**
 * Helper para verificar si el usuario es admin de plataforma
 */
export function isPlatformAdmin(role: UserRole): boolean {
  return role === 'platform_admin';
}

/**
 * Helper para verificar si el usuario es owner de academia
 */
export function isAcademyOwner(role: UserRole): boolean {
  return role === 'owner';
}

export default RoleGate;

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Crown, Shield, User } from 'lucide-react';

type AppRole = 'admin' | 'platon' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  user_email?: string;
}

interface RolesEditorProps {
  isAdmin: boolean;
}

const roleConfig: Record<AppRole, { label: string; icon: typeof Crown; color: string }> = {
  admin: { label: 'Administrador', icon: Shield, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  platon: { label: 'Platón', icon: Crown, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  user: { label: 'Usuario', icon: User, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

export function RolesEditor({ isAdmin }: RolesEditorProps) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('platon');
  const [adding, setAdding] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      // Fetch roles with user emails by joining profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch profiles to get emails
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name');

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.display_name]) || []);
      
      const rolesWithEmail = (rolesData || []).map(role => ({
        ...role,
        user_email: profilesMap.get(role.user_id) || 'Sin perfil'
      }));

      setRoles(rolesWithEmail as UserRole[]);
    } catch (err) {
      console.error('Error fetching roles:', err);
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAddRoleByEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error('Ingresa un email válido');
      return;
    }

    setAdding(true);
    try {
      // Look up approved access requests to find user_id by email
      const { data: requestData, error: requestError } = await supabase
        .from('access_requests')
        .select('user_id, email')
        .eq('email', newEmail.trim())
        .eq('status', 'approved')
        .single();

      let userId = requestData?.user_id;

      // If not found in requests, search in profiles by checking if display_name contains email
      if (!userId) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name');
        
        // Try to match - we need to find the user somehow
        // Best approach: use the access_requests table which stores email
        toast.error('Usuario no encontrado. El usuario debe solicitar acceso primero o usa el ID directamente.');
        setAdding(false);
        return;
      }

      // Add the role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuario ya tiene ese rol');
        } else {
          throw error;
        }
      } else {
        toast.success(`Rol ${newRole} asignado correctamente`);
        setNewEmail('');
        fetchRoles();
      }
    } catch (err) {
      console.error('Error adding role:', err);
      toast.error('Error al añadir rol');
    } finally {
      setAdding(false);
    }
  };

  const handleAddRoleById = async (userId: string) => {
    if (!userId.trim()) {
      toast.error('Ingresa un ID de usuario');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId.trim(),
          role: newRole,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuario ya tiene ese rol');
        } else {
          throw error;
        }
      } else {
        toast.success('Rol añadido correctamente');
        setNewEmail('');
        fetchRoles();
      }
    } catch (err) {
      console.error('Error adding role:', err);
      toast.error('Error al añadir rol');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      toast.success('Rol eliminado');
      fetchRoles();
    } catch (err) {
      console.error('Error deleting role:', err);
      toast.error('Error al eliminar rol');
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Solo los administradores pueden gestionar roles.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new role by email */}
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Email del usuario</label>
          <Input
            placeholder="usuario@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="font-mono text-sm"
            type="email"
          />
        </div>
        <div className="w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platon">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  Platón
                </div>
              </SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  Admin
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => handleAddRoleByEmail()}
          disabled={adding || !newEmail.trim()}
          className="gap-2"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Por Email
        </Button>
        <Button 
          variant="outline"
          onClick={() => handleAddRoleById(newEmail)}
          disabled={adding || !newEmail.trim()}
          className="gap-2"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Por UUID
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Por Email: busca en solicitudes de acceso aprobadas. Por UUID: usa el ID de usuario directamente.
      </p>

      {/* Roles table */}
      {roles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          <Crown className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay roles asignados</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario ID</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => {
              const config = roleConfig[role.role];
              const Icon = config.icon;
              return (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-xs">
                    {role.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(role.created_at).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRole(role.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

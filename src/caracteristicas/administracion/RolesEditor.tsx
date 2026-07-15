import { useState, useEffect } from 'react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/compartido/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/compartido/ui/table';
import { Badge } from '@/compartido/ui/badge';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Crown, Shield, User, Star } from 'lucide-react';

// Academy roles from academy_members table
type AcademyRole = 'owner' | 'admin' | 'platon' | 'member';

interface AcademyMember {
  academy_id: string;
  user_id: string;
  role: AcademyRole;
  joined_at: string;
  profiles?: {
    display_name: string | null;
    email?: string;
  };
}

interface RolesEditorProps {
  isAdmin: boolean;
  academyId: string;
}

const roleConfig: Record<AcademyRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'Propietario', icon: Star, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  admin: { label: 'Administrador', icon: Shield, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  platon: { label: 'Platón', icon: Crown, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  member: { label: 'Miembro', icon: User, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

export function RolesEditor({ isAdmin, academyId }: RolesEditorProps) {
  const [members, setMembers] = useState<AcademyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<AcademyRole>('member');
  const [adding, setAdding] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('academy_members')
        .select('*, profiles(display_name)')
        .eq('academy_id', academyId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      toast.error('Error al cargar miembros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && academyId) {
      fetchMembers();
    }
  }, [isAdmin, academyId]);

  const handleAddMemberById = async () => {
    if (!newUserId.trim()) {
      toast.error('Ingresa un ID de usuario');
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newUserId.trim())) {
      toast.error('El ID debe ser un UUID valido');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('academy_members')
        .upsert({
          academy_id: academyId,
          user_id: newUserId.trim(),
          role: newRole,
        }, { onConflict: 'academy_id,user_id' });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuario ya es miembro de esta academia');
        } else {
          throw error;
        }
      } else {
        toast.success(`${roleConfig[newRole].label} anadido correctamente`);
        setNewUserId('');
        fetchMembers();
      }
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error('Error al anadir miembro');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRoleValue: AcademyRole) => {
    try {
      const { error } = await supabase
        .from('academy_members')
        .update({ role: newRoleValue })
        .eq('academy_id', academyId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(`Rol actualizado a ${roleConfig[newRoleValue].label}`);
      fetchMembers();
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Error al actualizar rol');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('academy_members')
        .delete()
        .eq('academy_id', academyId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Miembro eliminado');
      fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Error al eliminar miembro');
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
      {/* Add new member by UUID */}
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">User ID (UUID)</label>
          <Input
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as AcademyRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  Propietario
                </div>
              </SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  Admin
                </div>
              </SelectItem>
              <SelectItem value="platon">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  Platon
                </div>
              </SelectItem>
              <SelectItem value="member">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  Miembro
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleAddMemberById}
          disabled={adding || !newUserId.trim()}
          className="gap-2"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Anadir
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Anade miembros por su User ID (UUID). El rol determina sus permisos en esta academia.
      </p>

      {/* Members table */}
      {members.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          <Crown className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay miembros en esta academia</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const config = roleConfig[member.role];
              const Icon = config.icon;
              return (
                <TableRow key={`${member.academy_id}-${member.user_id}`}>
                  <TableCell className="font-medium">
                    {member.profiles?.display_name || 'Sin nombre'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {member.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={member.role} 
                      onValueChange={(v) => handleUpdateRole(member.user_id, v as AcademyRole)}
                      disabled={member.role === 'owner'}
                    >
                      <SelectTrigger className={`w-[140px] ${config.color}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner" disabled={member.role !== 'owner'}>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-purple-400" />
                            Propietario
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-400" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="platon">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-400" />
                            Platon
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400" />
                            Miembro
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(member.joined_at).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={member.role === 'owner'}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title={member.role === 'owner' ? 'No se puede eliminar al propietario' : 'Eliminar'}
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

import { useState, useEffect } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Badge } from '@/compartido/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/compartido/ui/table';
import { Check, X, Clock, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AccessRequest {
  id: string;
  email: string;
  user_id: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
}

interface AccessRequestsEditorProps {
  isAdmin: boolean;
  academyId: string; // Requerido para scoped operations
}

export function AccessRequestsEditor({ isAdmin, academyId }: AccessRequestsEditorProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin]);

  const handleApprove = async (request: AccessRequest) => {
    if (!request.user_id) {
      toast.error('El usuario debe registrarse antes de aprobar el acceso');
      return;
    }

    setProcessing(request.id);
    
    try {
      // Add platon role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: 'platon'
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success(`Rol Platón asignado a ${request.email}`);
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('Error al aprobar solicitud');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: AccessRequest) => {
    setProcessing(request.id);
    
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Solicitud rechazada');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Error al rechazar solicitud');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('access_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Solicitud eliminada');
      fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Error al eliminar solicitud');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pendiente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 gap-1"><Check className="w-3 h-3" /> Aprobada</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" /> Rechazada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isAdmin) {
    return <p className="text-muted-foreground text-center py-8">Solo administradores pueden ver las solicitudes.</p>;
  }

  if (loading) {
    return <p className="text-muted-foreground text-center py-8">Cargando solicitudes...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-serif">Solicitudes de Acceso Platón</h3>
        <Badge variant="outline">{requests.filter(r => r.status === 'pending').length} pendientes</Badge>
      </div>

      {requests.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No hay solicitudes de acceso.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-sm">{request.email}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {request.user_id ? (
                      <Badge variant="secondary" className="gap-1">
                        <UserPlus className="w-3 h-3" /> Registrado
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin cuenta</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-400 hover:text-green-300"
                            onClick={() => handleApprove(request)}
                            disabled={processing === request.id || !request.user_id}
                            title={!request.user_id ? 'Usuario debe registrarse primero' : 'Aprobar'}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleReject(request)}
                            disabled={processing === request.id}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(request.id)}
                        disabled={processing === request.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

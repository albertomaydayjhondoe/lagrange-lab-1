import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function CreateAcademy() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isPublic: false,
    cloneAxes: false,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Debes iniciar sesión para crear una academia');
      }

      // Create academy
      const { data: academy, error: academyError } = await supabase
        .from('academies')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          is_public: formData.isPublic,
          owner_user_id: session.user.id,
        })
        .select()
        .single();

      if (academyError) {
        if (academyError.message.includes('unique')) {
          throw new Error('El slug ya está en uso. Por favor elige otro.');
        }
        throw academyError;
      }

      // Add creator as owner in academy_members
      const { error: memberError } = await supabase
        .from('academy_members')
        .insert({
          academy_id: academy.id,
          user_id: session.user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Optionally clone axes from genesis
      if (formData.cloneAxes) {
        const { data: genesisAxes } = await supabase
          .from('thematic_axes')
          .select('*')
          .eq('academy_id', '00000000-0000-0000-0000-000000000001');

        if (genesisAxes && genesisAxes.length > 0) {
          const axesToInsert = genesisAxes.map((axis: any) => ({
            ...axis,
            id: undefined, // Generate new ID
            academy_id: academy.id,
          }));
          await supabase.from('thematic_axes').insert(axesToInsert);
        }
      }

      navigate(`/academia/${formData.slug}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la academia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lagrange-dark text-white p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Crear Nueva Academia</h1>
          <p className="text-gray-400">
            Crea tu propia academia para explorar temas con tu comunidad
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Nombre de la Academia
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className="w-full px-4 py-3 bg-lagrange-surface border border-lagrange-border rounded-lg focus:outline-none focus:border-lagrange-accent"
              placeholder="Mi Academia"
              required
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug (URL)
            </label>
            <div className="flex items-center">
              <span className="px-4 py-3 bg-lagrange-surface border border-lagrange-border border-r-0 rounded-l-lg text-gray-400">
                /academia/
              </span>
              <input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                className="flex-1 px-4 py-3 bg-lagrange-surface border border-lagrange-border rounded-r-lg focus:outline-none focus:border-lagrange-accent"
                placeholder="mi-academia"
                required
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Solo letras minúsculas, números y guiones
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Descripción
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-lagrange-surface border border-lagrange-border rounded-lg focus:outline-none focus:border-lagrange-accent min-h-[120px]"
              placeholder="Describe el propósito de tu academia..."
            />
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-5 h-5 rounded border-lagrange-border bg-lagrange-surface text-lagrange-accent focus:ring-lagrange-accent"
              />
              <div>
                <span className="font-medium">Academia pública</span>
                <p className="text-sm text-gray-400">
                  Visible para todos los usuarios
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cloneAxes}
                onChange={(e) => setFormData({ ...formData, cloneAxes: e.target.checked })}
                className="w-5 h-5 rounded border-lagrange-border bg-lagrange-surface text-lagrange-accent focus:ring-lagrange-accent"
              />
              <div>
                <span className="font-medium">Clonar ejes de Génesis</span>
                <p className="text-sm text-gray-400">
                  Copiar los 5 ejes temáticos de la academia Génesis
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/academias')}
              className="px-6 py-3 border border-lagrange-border rounded-lg hover:bg-lagrange-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-lagrange-accent hover:bg-lagrange-accent/80 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Academia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

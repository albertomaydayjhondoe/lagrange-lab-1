import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, ArrowLeft, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateAcademy() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_public: true,
    clone_genesis: true,
    oracle_persona_prompt: '',
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      setError('Nombre y slug son requeridos');
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug)) {
      setError('El slug solo puede contener letras minúsculas, números y guiones');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Debes estar autenticado para crear una academia');
      }

      // Create academy via edge function or direct insert
      const { data: academy, error: createError } = await supabase
        .from('academies')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          is_public: formData.is_public,
          oracle_persona_prompt: formData.oracle_persona_prompt || null,
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          throw new Error('Este slug ya está en uso. Elige otro.');
        }
        throw createError;
      }

      // Add user as owner in academy_members
      const { error: memberError } = await supabase
        .from('academy_members')
        .insert({
          academy_id: academy.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        throw memberError;
      }

      // Clone genesis axes if requested
      if (formData.clone_genesis) {
        const genesisId = '00000000-0000-0000-0000-000000000001';
        const { data: genesisAxes } = await supabase
          .from('thematic_axes')
          .select('*')
          .eq('academy_id', genesisId);

        if (genesisAxes && genesisAxes.length > 0) {
          const newAxes = genesisAxes.map((axis: any) => ({
            ...axis,
            id: `${axis.id}-${academy.id.slice(0, 8)}`, // New ID based on original + academy prefix
            academy_id: academy.id,
          }));

          await supabase.from('thematic_axes').insert(newAxes);
        }
      }

      navigate(`/academia/${formData.slug}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la academia');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <Link
            to="/academies"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-serif text-white">Crear academia</h1>
              <p className="text-white/50 text-sm">Configura tu academia socrática</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s <= step ? 'bg-white text-black' : 'bg-white/10 text-white/50'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className="w-16 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-white mb-2">Nombre de la academia *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mi Academia Socrática"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-white mb-2">Slug (URL) *</label>
              <div className="flex items-center">
                <span className="px-4 py-3 bg-white/5 border border-white/10 border-r-0 rounded-l-lg text-white/50">
                  /academia/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="mi-academia"
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-r-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <p className="text-white/30 text-xs mt-1">
                Solo letras minúsculas, números y guiones
              </p>
            </div>

            <div>
              <label className="block text-white mb-2">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el propósito de tu academia..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-white"
              />
              <label htmlFor="is_public" className="text-white">
                Academia pública (cualquiera puede ver)
              </label>
            </div>

            <button
              onClick={() => {
                if (!formData.name || !formData.slug) {
                  setError('Nombre y slug son requeridos');
                  return;
                }
                setStep(2);
              }}
              className="w-full py-3 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-medium"
            >
              Continuar
            </button>
          </motion.div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="clone_genesis"
                checked={formData.clone_genesis}
                onChange={(e) => setFormData({ ...formData, clone_genesis: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-white"
              />
              <label htmlFor="clone_genesis" className="text-white">
                Copiar los 5 ejes de Génesis (Miedo, Control, Salud Mental, Legitimidad, Responsabilidad)
              </label>
            </div>

            <div>
              <label className="block text-white mb-2">Persona del oráculo (opcional)</label>
              <textarea
                value={formData.oracle_persona_prompt}
                onChange={(e) => setFormData({ ...formData, oracle_persona_prompt: e.target.value })}
                placeholder="Describe cómo quieres que sea la voz del oráculo. Por ejemplo: 'Un filósofo estoico que cuestiona todo con amargura constructiva...'"
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
              />
              <p className="text-white/30 text-xs mt-1">
                Si lo dejas vacío, se usará el oráculo predeterminado
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Creando...' : 'Crear academia'}
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

/**
 * SaaSWelcome - Página de bienvenida para Academias Estancas
 * 
 * Cada estudiante tiene su academia 100% aislada con:
 * - Motor IA privado
 * - Materiales propios
 * - Diálogos personales
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  BookOpen,
  Sparkles,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compartido/ui/card';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

export function SaaSWelcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/#/mi-academia`
      }
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-purple-400" />
            <span className="text-xl font-bold text-white">Academias Estancas</span>
          </div>
          {isAuthenticated ? (
            <Button onClick={() => navigate('/mi-academia')} variant="secondary">
              Mi Academia
            </Button>
          ) : (
            <Button onClick={handleGoogleLogin} variant="secondary">
              Iniciar Sesión
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Tu Academia
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Completamente Aislada
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Cada estudiante tiene su propio espacio con motor IA privado, materiales propios y diálogos personales.
            Sin compartición, sin interferencias.
          </p>
        </motion.div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <Lock className="w-12 h-12 text-purple-400 mb-4" />
                <CardTitle className="text-white">100% Estanco</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Tu academia no comparte recursos con nadie. Motor IA, materiales y diálogos son solo tuyos.
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <Sparkles className="w-12 h-12 text-purple-400 mb-4" />
                <CardTitle className="text-white">Motor IA Privado</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Tu propio oráculo socrático con contexto de todos tus materiales. Sin límites.
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/5 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <BookOpen className="w-12 h-12 text-purple-400 mb-4" />
                <CardTitle className="text-white">Materiales Propios</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Sube tus PDFs, videos y documentos. El oráculo los usa para responder tus preguntas.
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isAuthenticated ? (
            <Button 
              size="lg" 
              onClick={() => navigate('/mi-academia')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Ir a Mi Academia <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button 
              size="lg" 
              onClick={handleGoogleLogin}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Crear Mi Academia Estanca <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>Academias Estancas - Un producto Lagrange Lab</p>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/compartido/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/compartido/ui/card';

interface ConfigStatus {
  name: string;
  value: string;
  isSet: boolean;
  isSecret?: boolean;
}

export default function Configuracion() {
  const [configs, setConfigs] = useState<ConfigStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = () => {
    setLoading(true);
    
    const status: ConfigStatus[] = [
      {
        name: 'VITE_SUPABASE_URL',
        value: import.meta.env.VITE_SUPABASE_URL || '',
        isSet: !!import.meta.env.VITE_SUPABASE_URL,
      },
      {
        name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
        value: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        isSet: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        isSecret: true,
      },
      {
        name: 'VITE_SUPABASE_PROJECT_ID',
        value: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
        isSet: !!import.meta.env.VITE_SUPABASE_PROJECT_ID,
      },
    ];

    // Check if Supabase URL is valid
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      // Validate URL format
      try {
        const url = new URL(supabaseUrl);
        if (!url.hostname.includes('supabase.co')) {
          status[0].value = 'URL inválida (debe ser .supabase.co)';
          status[0].isSet = false;
        }
      } catch {
        status[0].value = 'URL malformada';
        status[0].isSet = false;
      }
    }

    setConfigs(status);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-serif text-foreground">Configuración</h1>
              <p className="text-sm text-muted-foreground">
                Estado de las variables de entorno
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Variables de Entorno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : (
                configs.map((config, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-mono text-sm">{config.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.isSet 
                          ? config.isSecret 
                            ? `✓ Configurada (${config.value.substring(0, 20)}...)`
                            : `✓ ${config.value}`
                          : '✗ No configurada'
                        }
                      </p>
                    </div>
                    {config.isSet ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                ))
              )}
              
              <Button onClick={checkConfiguration} variant="outline" className="w-full mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar nuevamente
              </Button>
            </CardContent>
          </Card>

          {!configs.every(c => c.isSet) && (
            <Card className="border-yellow-500/50">
              <CardHeader>
                <CardTitle className="text-yellow-500">⚠️ Configuración Incompleta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Faltan variables de entorno. Para que la aplicación funcione, necesitas configurar:
                </p>
                
                <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm space-y-2">
                  <p><span className="text-green-500">VITE_SUPABASE_URL</span>=https://tu-proyecto.supabase.co</p>
                  <p><span className="text-green-500">VITE_SUPABASE_PUBLISHABLE_KEY</span>=eyJ...</p>
                  <p><span className="text-green-500">VITE_SUPABASE_PROJECT_ID</span>=tu-project-id</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Pasos para configurar:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Ve a <a href="https://supabase.com/dashboard" target="_blank" className="text-primary hover:underline">Supabase Dashboard</a></li>
                    <li>Crea o selecciona tu proyecto</li>
                    <li>Ve a Settings → API</li>
                    <li>Copia los valores de URL y anon/public key</li>
                    <li>Ve a <a href="https://vercel.com/dashboard" target="_blank" className="text-primary hover:underline">Vercel Dashboard</a></li>
                    <li>Selecciona tu proyecto → Settings → Environment Variables</li>
                    <li>Agrega las tres variables con sus valores</li>
                    <li>Haz un nuevo deploy</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {configs.every(c => c.isSet) && (
            <Card className="border-green-500/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-green-500">
                  <CheckCircle className="w-8 h-8" />
                  <div>
                    <h4 className="font-medium text-foreground">Configuración Completa</h4>
                    <p className="text-sm text-muted-foreground">
                      Las variables de entorno están configuradas. Si el login no funciona, verifica:
                    </p>
                  </div>
                </div>
                <ul className="mt-4 text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Auth de Supabase está habilitado (Authentication → Settings)</li>
                  <li>El proyecto de Supabase está activo</li>
                  <li>No hay errores en la consola del navegador (F12)</li>
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Nota importante</h4>
            <p className="text-sm text-muted-foreground">
              Esta página solo muestra el estado del <strong>frontend</strong>. 
              Para las Edge Functions de IA, también necesitas configurar 
              <code className="bg-muted px-1 rounded">AI_API_KEY</code> en los 
              Secrets de Supabase (no en Vercel).
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

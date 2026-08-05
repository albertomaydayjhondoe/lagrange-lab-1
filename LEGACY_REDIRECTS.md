# REDIRECTS LEGACY — Tabla de Compatibilidad

Este documento lista todas las rutas legacy y su redirección equivalente en el nuevo árbol de rutas.

## Regla General
**Ningún enlace antiguo debe romperse.** Las rutas legacy se mantienen como redirects 301 hacia sus equivalentes en `/soberania/*` o `/aprendizaje/*`.

---

## Tabla de Redirects Legacy

| Ruta Legacy | Redirect a | Tipo | Notas |
|------------|------------|------|-------|
| `/oracle` | `/aprendizaje` | 301 | Legacy Oráculo principal |
| `/oracle/:mode` | `/aprendizaje` | 301 | Modos del Oráculo |
| `/library` | `/aprendizaje` | 301 | Biblioteca RAG |
| `/rag` | `/aprendizaje` | 301 | Alias de library |
| `/academies` | `/aprendizaje` | 301 | Selector de academias |
| `/perfil` | `/aprendizaje/perfil` | 301 | Portfolio del alumno |
| `/config` | `/soberania` | 301 | Configuración |
| `/settings` | `/soberania` | 301 | Alias de config |
| `/admin` | `/soberania` | 301 | Panel de administración |
| `/carrera/:slug/oraculo` | `/aprendizaje/:slug/oraculo` | 301 | Oráculo por academia |
| `/carrera/:slug/materia/:id/aportar` | `/aprendizaje/:slug/materia/:id/aportar` | 301 | Aportar apuntes |
| `/carrera/:slug/tutorias` | `/aprendizaje/:slug/tutorias` | 301 | Tutorías |
| `/research` | `/aprendizaje/research` | 301 | Research Lab |
| `/lab` | `/aprendizaje/research` | 301 | Alias de research |
| `/podcast` | `/aprendizaje/podcast` | 301 | Podcast |
| `/pitagoras` | `/aprendizaje/pitagoras` | 301 | Pitágoras Lab |
| `/pitagoras-lab` | `/aprendizaje/pitagoras` | 301 | Alias de pitagoras |
| `/map` | `/aprendizaje/topologia` | 301 | Mapa topológico |
| `/topologia` | `/aprendizaje/topologia` | 301 | Alias de map |

---

## Rutas Mantenidas (sin redirect)

| Ruta | Componente | Notas |
|------|------------|-------|
| `/` | PAAUPage + RoleGate | Raíz con redirección por rol |
| `/auth` | AuthPage | Login/registro (sin cambios) |

---

## Verificación Manual

Para verificar que todos los redirects funcionan:

```bash
# Test redirects (ejemplo con curl)
curl -I https://tu-dominio.com/oracle
# Debe devolver 301 → /aprendizaje

curl -I https://tu-dominio.com/admin
# Debe devolver 301 → /soberania

curl -I https://tu-dominio.com/carrera/academia-lexis/oraculo
# Debe devolver 301 → /aprendizaje/academia-lexis/oraculo
```

---

## SEO

Los redirects 301 preservan el "link juice" de SEO para los motores de búsqueda. Los enlaces antiguos indexados seguirán funcionando.

---

**Última actualización:** 2026-08-05

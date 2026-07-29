# Login Rector: Elevación y Soberanía

## Concepto

El **Rector** es la máxima autoridad académica institucional dentro de una academia/universidad en Lagrange Lab. Este rol representa la **soberanía institucional** con privilegios elevados que permiten gestionar la identidad, miembros y contenido de su institución.

## Jerarquía de Roles

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PLATFORM ADMIN (Soberanía Global)                │
│  • Gestiona TODAS las academias                                      │
│  • Puede designar/remover rectores                                   │
│  • Acceso a métricas de plataforma                                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RECTOR (Soberanía Institucional)                  │
│  • Autoridad máxima en SU academia                                   │
│  • Puede designar admins                                            │
│  • Gestiona identidad institucional                                  │
│  • Control total sobre miembros y contenido                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │  OWNER  │   │  ADMIN  │   │ PLATON  │
              │(propie- │   │(gestión │   │(acceso  │
              │ tario)  │   │ usuarios)   │socrático│
              └─────────┘   └─────────┘   └─────────┘
```

## Privilegios del Rector

### Gestión Institucional
| Capacidad | Rector | Owner | Admin | Platón | Member |
|-----------|:------:|:-----:|:-----:|:------:|:------:|
| Ver contenido de academia | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestionar miembros | ✅ | ✅ | ✅ | ❌ | ❌ |
| Designar admins | ✅ | ✅ | ❌ | ❌ | ❌ |
| Designar rectores | ❌* | ❌* | ❌ | ❌ | ❌ |
| Modificar identidad institucional | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminar academia | ❌ | ✅ | ❌ | ❌ | ❌ |
| Ver métricas | ✅ | ✅ | ✅ | ❌ | ❌ |

*Solo platform_admin puede designar/quitar rectores

### Soberanía Rectoral
- **Identidad Institucional**: Título personalizado (Rector, Vice-Rector, Decano, Director General, Presidente)
- **Decreto de Nombramiento**: Número de resolución institucional
- **Juramento Institucional**: Texto del juramento del rector
- **Sello Rectoral**: URL del sello digital (para documentos oficiales)

## Modelo de Datos

### Tabla `academia_rectors`
```sql
CREATE TABLE public.academia_rectors (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  academy_id UUID REFERENCES academies(id),
  title TEXT DEFAULT 'Rector',  -- Rector, Vice-Rector, Decano, Director General, Presidente
  appointed_at TIMESTAMPTZ,
  appointed_by UUID REFERENCES profiles(id),
  decree_number TEXT,
  institution_oath TEXT,
  rector_seal_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_current BOOLEAN DEFAULT TRUE,  -- Solo un rector activo por academia
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Roles en `academy_members`
```sql
-- Extendido con rol 'rector'
CHECK (role IN ('owner', 'admin', 'platon', 'member', 'rector'))
```

## Funciones Helper

### `user_is_academy_rector(academy_id)`
Verifica si el usuario actual es el rector activo de una academia.

```typescript
const { isRector } = useIsRector(academyId)
```

### `user_can_manage_academy(academy_id)`
Verifica si el usuario puede gestionar la academia (owner/rector/platform_admin).

```typescript
const { canManage } = useCanManageAcademy(academyId)
```

### `assign_rector(academy_id, user_id, title, decree_number, institution_oath)`
Designa un nuevo rector con metadatos institucionales.

## Edge Function: `/functions/v1/manage-rector`

### GET `/functions/v1/manage-rector/{academy_id}`
Obtener información del rector de una academia.

**Respuesta:**
```json
{
  "id": "uuid",
  "title": "Rector",
  "appointed_at": "2026-07-29T00:00:00Z",
  "decree_number": "RES-2026-001",
  "institution_oath": "Juro por Dios y la Patria...",
  "profiles": {
    "full_name": "Dr. Juan Pérez",
    "avatar_url": "https://..."
  }
}
```

### POST `/functions/v1/manage-rector`
Designar un nuevo rector.

**Body:**
```json
{
  "academy_id": "uuid",
  "user_id": "uuid",
  "title": "Rector",
  "decree_number": "RES-2026-001",
  "institution_oath": "Juro por Dios y la Patria..."
}
```

### PUT `/functions/v1/manage-rector`
Actualizar datos del rector.

### DELETE `/functions/v1/manage-rector`
Desactivar un rector (preserva historial).

## Hooks de React

```typescript
import { 
  useIsRector,           // ¿Es rector de esta academia?
  useAcademyRector,       // Info del rector
  useRectorAcademies,     // Academias donde es rector
  useCanManageAcademy     // ¿Puede gestionar la academia?
} from '@/lib/supabase/hooks'
```

## Políticas RLS

### `academia_rectors`
- **SELECT**: Público (cualquiera puede ver quién es el rector)
- **INSERT**: Quien puede gestionar la academia (owner/rector/platform_admin)
- **UPDATE**: Owner/rector/platform_admin
- **DELETE**: Solo platform_admin (los rectores se desactivan, no se borran)

### `academy_members` actualizado
- **INSERT/UPDATE/DELETE**: Agregado rol 'rector' con mismos privilegios que owner

### `academies` actualizado
- **SELECT/UPDATE**: Owner + Rector pueden ver/modificar su academia

## Uso en Frontend

### Verificar si es rector
```tsx
function AcademySettings({ academyId }) {
  const { isRector, loading } = useIsRector(academyId)
  const { canManage } = useCanManageAcademy(academyId)

  if (loading) return <Spinner />
  
  return (
    <div>
      {canManage && <AdminPanel />}
      {isRector && <RectorBadge title="Rector" />}
    </div>
  )
}
```

### Mostrar insignia de rector
```tsx
function RectorBadge({ title, decreeNumber }) {
  return (
    <div className="rector-badge">
      <span className="seal">🏛️</span>
      <div>
        <strong>{title}</strong>
        {decreeNumber && <small>Decreto: {decreeNumber}</small>}
      </div>
    </div>
  )
}
```

## Seguridad

1. **Soberanía Escalonada**: Platform Admin > Rector > Owner > Admin > Member
2. **Transparencia**: Cualquier usuario puede ver quién es el rector
3. **Inmutabilidad Histórica**: Los rectores desactivados se marcan, no se borran
4. **Auditoría**: Cada cambio de rector queda registrado con appointed_by
5. **Constraints**: Solo un rector activo por academia a la vez

## Despliegue

```bash
# Aplicar migración
supabase db push

# Deploy edge function
supabase functions deploy manage-rector
```

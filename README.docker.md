# 🐳 Lagrange Lab - Docker Self-Hosted

Plataforma educativa PaaS completamente funcional sin dependencias de servicios externos.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     DOCKER COMPOSE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│   │   FRONTEND   │   │     API      │   │     DB       │   │
│   │   (nginx)    │◀──│  (Node.js)   │◀──│  (pgvector)  │   │
│   │   :80        │   │   :3001      │   │   :5432      │   │
│   └──────────────┘   └──────────────┘   └──────────────┘   │
│         │                 │                                  │
│         └─────────────────┴─────────────────────────────────│
│                    lagrange-net                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Configurar variables de entorno
cp .env.docker .env

# 2. Editar .env y añadir tu API key de OpenAI
nano .env
# AI_API_KEY=sk-your-key-here

# 3. Iniciar todos los servicios
docker compose up -d

# 4. Verificar
docker compose ps
curl http://localhost/health
```

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 80 | Aplicación web (nginx) |
| API | 3001 | REST API (Express) |
| Database | 5432 | PostgreSQL + pgvector |

## Endpoints API

### Autenticación
```bash
# Registrar usuario
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Academias
```bash
# Listar academias
curl http://localhost:3001/api/academies

# Crear academia (requiere auth)
curl -X POST http://localhost:3001/api/academies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mi Academia","slug":"mi-academia"}'
```

### Oráculo (Tutoría IA)
```bash
# Chat con tutor IA
curl -X POST http://localhost:3001/api/oracles/tutoring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"academyId":"00000000-0000-0000-0000-000000000001","question":"¿Qué es la fotosíntesis?"}'
```

### RAG (Ingesta de documentos)
```bash
# Ingerir texto
curl -X POST http://localhost:3001/api/rag/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"academyId":"00000000-0000-0000-0000-000000000001","content":"Texto del documento...","title":"Mi Documento"}'
```

## Comandos Útiles

```bash
# Ver logs
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api

# Reiniciar servicios
docker compose restart

# Detener todo
docker compose down

# Detener y eliminar volúmenes (⚠️ borra datos)
docker compose down -v

# Reconstruir imágenes
docker compose build --no-cache
```

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | Password de PostgreSQL | postgres |
| `JWT_SECRET` | Secret para JWT | change-me |
| `AI_API_KEY` | API key de OpenAI | - |
| `AI_GATEWAY_URL` | URL del gateway de IA | https://api.openai.com/v1 |
| `AI_CHAT_MODEL` | Modelo para chat | gpt-4o-mini |
| `AI_EMBEDDING_MODEL` | Modelo para embeddings | text-embedding-3-small |
| `CORS_ORIGIN` | Origen CORS permitido | * |

## Estructura de Archivos

```
.
├── docker-compose.yml      # Orquestación de servicios
├── Dockerfile.frontend     # Build del frontend
├── Dockerfile.api         # Build de la API
├── .env.docker            # Variables de entorno
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts       # API Express completa
└── docker/
    ├── init-db.sql        # Schema de PostgreSQL
    └── nginx.conf         # Configuración de nginx
```

## Base de Datos

Tablas disponibles:
- `users` - Usuarios y autenticación
- `profiles` - Perfiles de usuario
- `academies` - Academias multi-tenant
- `academy_members` - Miembros de academias
- `academy_spaces` - Espacios/materias
- `corpus_fragments` - Documentos RAG con vectores
- `topology_nodes` - Nodos del mapa de conocimiento
- `tutoring_history` - Historial de tutorías
- Y más...

## Production Deployment

Para producción:

1. Cambiar `JWT_SECRET` a un valor seguro
2. Configurar SSL/TLS (agregar nginx con certificados)
3. Usar volumenes externos para persistencia
4. Configurar backups de PostgreSQL
5. Añadir rate limiting más restrictivo
6. Configurar logging centralizado

```yaml
# Ejemplo de producción
services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${PROD_DB_PASSWORD}
  
  api:
    restart: always
    resources:
      limits:
        memory: 512M
```

## Troubleshooting

### La base de datos no inicia
```bash
docker compose down -v
docker compose up -d
```

### La API no puede conectar a la DB
```bash
docker compose logs api
# Verificar DB_HOST en variables de entorno
```

### Frontend da error 502
```bash
docker compose logs frontend
# Verificar que la API está corriendo
```

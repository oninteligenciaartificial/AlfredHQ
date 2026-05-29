# AlfredHQ — Plan de Desarrollo

> **Objetivo:** Completar MVP v1 (uso interno OnIA) y preparar v2 (SaaS vendible)
> **Stack:** Next.js 16 / Supabase / Claude API / Tailwind / TypeScript
> **Última actualización:** 2026-05-22

---

## Estado Actual del Proyecto

### ✅ Ya construido
- Auth (Supabase Magic Link + OAuth shell)
- Layout dashboard con sidebar
- Dashboard con métricas reales de DB
- Agente IA (chat streaming, advisory + execution, tool use)
- Gestión de tareas (CRUD real con DB)
- Settings/Goals (CRUD real)
- Settings/Workspace (CRUD real)
- Capa de seguridad completa (rate limit, SSRF, sanitización, cifrado AES-256, file upload validation)
- API routes: `/api/agent/chat`, `/api/agent/conversations`, `/api/agent/tasks/generate`, `/api/goals`, `/api/tasks`, `/api/sync/analytics`
- Schema DB completo: workspaces, social_accounts, workspace_goals, agent_conversations, daily_tasks, content_posts, analytics_snapshots, audit_logs

### ❌ Pendiente (Gaps del MVP)

| Gap | Archivo(s) | Prioridad |
|-----|-----------|-----------|
| Planner usa datos placeholder | `src/app/(dashboard)/planner/page.tsx` | ALTA |
| Analytics sin gráficas reales | `src/app/(dashboard)/analytics/page.tsx` | ALTA |
| Settings/Accounts es placeholder | `src/app/(dashboard)/settings/accounts/page.tsx` | ALTA |
| OAuth flows sociales sin implementar | `/api/social/callback/[network]` | ALTA |
| Generación de imágenes no implementada | agent tools | MEDIA |
| Generación de carruseles no implementada | agent tools | MEDIA |
| n8n workflows no configurados | external | MEDIA |
| Post publishing route | `/api/posts/publish` | ALTA |
| Multi-tenant client management | nueva sección | BAJA |
| Billing system | nueva sección | BAJA |

---

## Fase 0 — Descubrimiento (COMPLETADO)

### Allowed APIs confirmadas

**Supabase (client-side):**
- `createClient()` from `@/lib/supabase/client` — para componentes 'use client'
- `createClient()` from `@/lib/supabase/server` — para API routes y server components
- Tablas disponibles: `workspaces`, `social_accounts`, `workspace_goals`, `agent_conversations`, `daily_tasks`, `content_posts`, `analytics_snapshots`

**Claude API:**
- Client: `anthropic` from `@/lib/claude/client`
- Tools: definir en `src/lib/claude/tools.ts` con `input_schema`
- Tool handlers: implementar en `src/lib/agent-tools.ts`
- Registrar handler en `TOOL_HANDLERS` en `src/app/api/agent/chat/route.ts`

**Seguridad (siempre usar):**
- `getCurrentUser()` from `@/lib/security/authorization`
- `getUserWorkspace(userId, workspaceId)` from `@/lib/security/authorization`
- `handleApiError(error, context)` from `@/lib/security/error-handler`
- `checkRateLimit(userId, tier)` from `@/lib/security/rate-limit`

**Tipos disponibles:**
- `Network`, `Plan`, `AgentMode`, `TaskType`, `TaskStatus`, `PostStatus`, `MediaType`, `MetricName`, `GoalMetric`
- Interfaces: `Workspace`, `SocialAccount`, `WorkspaceGoal`, `DailyTask`, `ContentPost`, `AnalyticsSnapshot`
- Todos en `src/types/index.ts`

**Hook de workspace:**
- `useWorkspace()` from `@/hooks/use-workspace` — retorna `{ workspace, loading }`

**Anti-patterns identificados:**
- NO usar datos hardcoded/placeholder en producción
- NO llamar APIs sociales desde frontend — siempre API routes
- NO guardar tokens de acceso sin cifrar — usar `encrypt()` from `@/lib/crypto`
- NO omitir `getCurrentUser()` en API routes protegidas

---

## Fase 1 — Core Data Layer (Paralelo)

> 4 streams independientes — pueden ejecutarse simultáneamente

### Stream 1A — Planner con Datos Reales

**Objetivo:** Conectar Planner al DB real + post editor funcional

**Archivos a modificar:**
- `alfred/src/app/(dashboard)/planner/page.tsx` — reemplazar placeholder con datos reales
- `alfred/src/app/api/posts/route.ts` — crear si no existe (CRUD para content_posts)

**Tareas:**
1. Leer `src/types/index.ts` para tipos `ContentPost`, `PostStatus`, `Network`
2. Reemplazar `placeholderPosts` con query real a `content_posts` table
3. Añadir estado de carga con skeleton
4. Implementar botón "Nuevo Post" con modal/panel lateral:
   - Campo caption (textarea)
   - Selector de redes (instagram/tiktok/linkedin - checkboxes)
   - Date/time picker para scheduled_at
   - Selector de tipo de media (post/reel/carousel/text)
5. POST a `/api/posts` para crear posts
6. Navegación real del calendario (mes actual real, no hardcoded 2026)
7. Click en post existente → ver detalles + cambiar estado

**Verificación:**
- [ ] `placeholderPosts` eliminados del código
- [ ] Posts del DB aparecen en calendario
- [ ] Se puede crear un nuevo draft desde UI
- [ ] Navegación de mes funciona con fecha real

---

### Stream 1B — Analytics con Gráficas Reales

**Objetivo:** Dashboard de analytics con charts reales usando datos de `analytics_snapshots`

**Archivos a modificar:**
- `alfred/src/app/(dashboard)/analytics/page.tsx`
- `alfred/package.json` — añadir recharts

**Tareas:**
1. Instalar recharts: `npm install recharts`
2. Leer datos de `analytics_snapshots` agrupados por `network` y `metric_name`
3. Implementar:
   - **LineChart:** Evolución de followers en el tiempo (por red)
   - **BarChart:** Engagement rate comparativo por red
   - **StatCards:** Totales de reach, impressions, likes, comments, shares
   - **Selector de período:** 7d / 30d / 90d
   - **Selector de red:** All / Instagram / TikTok / LinkedIn
4. Estado vacío con CTA para conectar redes sociales
5. Loading skeletons mientras cargan datos

**Verificación:**
- [ ] Charts renderizan sin errores
- [ ] Selector de período cambia los datos
- [ ] Sin `analytics_snapshots` muestra empty state apropiado
- [ ] No hay `console.log` en producción

---

### Stream 1C — OAuth Social Accounts

**Objetivo:** Flujo OAuth real para conectar Instagram, TikTok y LinkedIn

**Archivos a crear/modificar:**
- `alfred/src/app/(dashboard)/settings/accounts/page.tsx` — reemplazar placeholder con flujo real
- `alfred/src/app/api/social/callback/[network]/route.ts` — OAuth callback handler
- `alfred/src/lib/social/instagram.ts` — ya existe, completar
- `alfred/src/lib/social/linkedin.ts` — ya existe, completar
- `alfred/src/lib/social/tiktok.ts` — ya existe, completar

**Tareas:**
1. Leer `src/lib/social/instagram.ts`, `linkedin.ts`, `tiktok.ts` para ver estado actual
2. Implementar botón "Conectar" → redirect a OAuth URL de cada red
3. Callback handler en `/api/social/callback/[network]`:
   - Validar `state` param (CSRF)
   - Intercambiar `code` por tokens
   - Cifrar tokens con `encrypt()` from `@/lib/crypto`
   - Guardar en `social_accounts` table
   - Redirect a `/settings/accounts`
4. UI de accounts con datos reales de `social_accounts` table
5. Botón "Desconectar" → DELETE en `social_accounts`
6. Mostrar username, avatar y estado activo/inactivo

**Datos de ENV requeridos:**
- `META_APP_ID`, `META_APP_SECRET`
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

**Verificación:**
- [ ] Botón conectar redirige a OAuth provider
- [ ] Callback guarda tokens cifrados
- [ ] UI muestra cuentas conectadas con username real
- [ ] Desconectar elimina de DB y actualiza UI

---

### Stream 1D — Post Publishing Route

**Objetivo:** Ruta API para publicar posts programados (llamada por n8n cada 15 min)

**Archivos a crear:**
- `alfred/src/app/api/posts/publish/route.ts`
- `alfred/src/app/api/posts/route.ts` (CRUD básico)

**Tareas:**
1. `POST /api/posts/publish`:
   - Autenticación via `SUPABASE_SERVICE_ROLE_KEY` (llamada interna de n8n)
   - Query `content_posts` donde `status = 'scheduled'` y `scheduled_at <= now()`
   - Para cada post: llamar API de cada red en `networks[]`
   - Usar tokens desencriptados de `social_accounts`
   - Actualizar `status = 'published'` y `published_at = now()`
   - En error: `status = 'failed'`
2. `GET/POST/PATCH/DELETE /api/posts`:
   - Protegido con `getCurrentUser()` + `getUserWorkspace()`
   - Paginación con `limit` y `offset`
   - Filtros: `status`, `network`, `date_range`

**Verificación:**
- [ ] `/api/posts/publish` procesa posts programados correctamente
- [ ] Posts publicados actualizan status en DB
- [ ] CRUD de posts funciona con auth

---

## Fase 2 — Agent Enhancement (Paralelo)

> 2 streams independientes — ejecutar después de Fase 1

### Stream 2A — Generación de Imágenes

**Objetivo:** Alfred puede generar imágenes para posts usando Claude + image gen API

**Archivos a modificar:**
- `alfred/src/lib/claude/tools.ts` — añadir tool `generate_image`
- `alfred/src/lib/agent-tools.ts` — añadir handler `handleGenerateImage`
- `alfred/src/app/api/agent/chat/route.ts` — registrar en `TOOL_HANDLERS`

**Patrón a seguir:** Copiar estructura de `schedule_post` tool existente

**Nueva tool a añadir:**
```typescript
{
  name: 'generate_image',
  description: 'Genera una imagen para un post o carrusel usando IA',
  input_schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Descripción detallada de la imagen' },
      style: { type: 'string', enum: ['realistic', 'illustration', 'minimalist', 'corporate'], description: 'Estilo visual' },
      aspect_ratio: { type: 'string', enum: ['1:1', '4:5', '9:16', '16:9'], description: 'Aspecto para la red' },
      network: { type: 'string', enum: ['instagram', 'tiktok', 'linkedin'], description: 'Red destino' },
    },
    required: ['prompt', 'aspect_ratio'],
  },
}
```

**Integración con imagen gen:**
- Opción A: fal.ai API (rápido, barato) — `@fal-ai/client`
- Opción B: Replicate (Flux) — `replicate` npm package
- Guardar imagen generada en Supabase Storage en bucket `media`
- Retornar URL pública para usar en `schedule_post` o `create_draft`

**ENV requerida:** `FAL_API_KEY` o `REPLICATE_API_TOKEN`

**Verificación:**
- [ ] Alfred puede generar imagen cuando se le pide en modo Execution
- [ ] Imagen aparece en Supabase Storage
- [ ] URL retornada es usable en `schedule_post`

---

### Stream 2B — Generación de Carruseles

**Objetivo:** Alfred puede generar carruseles multi-slide para Instagram/LinkedIn

**Archivos a modificar:**
- `alfred/src/lib/claude/tools.ts` — añadir tool `generate_carousel`
- `alfred/src/lib/agent-tools.ts` — añadir handler `handleGenerateCarousel`
- `alfred/src/app/api/carousel/generate/route.ts` — ruta dedicada para generación

**Nueva tool:**
```typescript
{
  name: 'generate_carousel',
  description: 'Genera un carrusel con múltiples slides para Instagram o LinkedIn',
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Tema principal del carrusel' },
      slides_count: { type: 'number', description: 'Número de slides (3-10)', minimum: 3, maximum: 10 },
      style: { type: 'string', enum: ['educational', 'promotional', 'storytelling', 'tips'] },
      network: { type: 'string', enum: ['instagram', 'linkedin'] },
      color_scheme: { type: 'string', description: 'Esquema de colores (ej: azul corporativo, minimalista negro)' },
    },
    required: ['topic', 'slides_count', 'network'],
  },
}
```

**Lógica del handler:**
1. Claude genera estructura del carrusel (JSON con texto por slide)
2. Para cada slide: llamar image gen API con prompt específico + texto overlay
3. Guardar todas las imágenes en Supabase Storage
4. Retornar array de URLs → pasable directo a `schedule_post` como `media_urls`

**Verificación:**
- [ ] Alfred genera carrusel de N slides cuando se le pide
- [ ] Todas las imágenes tienen consistencia visual
- [ ] `media_urls` array retornado es válido para `schedule_post`

---

## Fase 3 — Automatización n8n

> Ejecutar después de Fase 1 completa

### Workflow 1: Generación de Tareas Diarias (7:00 AM)

**Trigger:** Cron `0 7 * * *`
**Acción:**
1. `GET` workspaces activos desde Supabase (todos los `workspaces`)
2. Para cada workspace: `POST /api/agent/tasks/generate` con `workspaceId`
3. Log de éxito/error por workspace

**Autenticación hacia Alfred:** Header `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`

---

### Workflow 2: Sync Analytics (cada 6 horas)

**Trigger:** Cron `0 */6 * * *`
**Acción:**
1. `GET` workspaces con `social_accounts` activos
2. Para cada workspace + red: llamar API correspondiente para métricas
3. `POST /api/sync/analytics` con los datos obtenidos

---

### Workflow 3: Publicación Programada (cada 15 min)

**Trigger:** Cron `*/15 * * * *`
**Acción:**
1. `POST /api/posts/publish` con service role auth
2. Alfred procesa todos los posts cuyo `scheduled_at <= now()`

---

## Fase 4 — Multi-Tenant y Billing (v2)

> Ejecutar después de MVP v1 validado

### Multi-Tenant Client Management

**Objetivo:** Agencia (OnIA) puede gestionar múltiples clientes

**Nuevas páginas:**
- `/clients` — lista de workspaces de clientes
- `/clients/new` — onboarding de nuevo cliente
- `/clients/[id]` — vista de workspace de cliente específico

**DB cambios:**
- `workspaces.agency_id` — FK a tabla de agencias
- `workspaces.client_email` — email de contacto del cliente
- `workspaces.plan` — tier del cliente

**Roles:**
- `agency_admin` — ve y gestiona todos los workspaces de sus clientes
- `workspace_owner` — ve solo su propio workspace

---

### Billing (Stripe o Libélula)

**Decisión:** Usar **Stripe** para Internacional, **Libélula** para Bolivia

**Integración Stripe:**
- Webhook en `/api/billing/webhook`
- Plans: starter ($X/mes), pro ($Y/mes)
- Actualizar `workspaces.plan` en eventos de Stripe

**Páginas:**
- `/settings/billing` — estado de suscripción, upgrade/downgrade
- `/settings/billing/success` — confirmación post-pago

---

## Guía de Contexto para Agentes

### Cada agente que ejecute una fase DEBE:

1. **Leer primero:** `alfred/src/types/index.ts` para tipos exactos
2. **Leer el archivo a modificar** completo antes de editar
3. **Seguir patrones existentes:** copiar estructura de archivos similares existentes
4. **No inventar:** Si una API no está en este doc o en los archivos existentes, no asumirla
5. **Usar seguridad:** `getCurrentUser()` en TODA API route protegida
6. **Sin `console.log`:** Solo logging estructurado (o nada)
7. **Verificar con checklist** al final de cada tarea

### Orden de archivos a leer por stream:

| Stream | Leer primero | Luego |
|--------|-------------|-------|
| 1A (Planner) | `planner/page.tsx`, `types/index.ts` | `api/tasks/route.ts` como patrón |
| 1B (Analytics) | `analytics/page.tsx`, `types/index.ts` | `dashboard/page.tsx` como patrón de queries |
| 1C (OAuth) | `social/instagram.ts`, `social/linkedin.ts`, `social/tiktok.ts` | `lib/crypto.ts` para cifrado |
| 1D (Publishing) | `api/agent/chat/route.ts` como patrón de API route | `agent-tools.ts` como patrón de handlers |
| 2A (Images) | `lib/claude/tools.ts`, `lib/agent-tools.ts` | `api/agent/chat/route.ts` para TOOL_HANDLERS |
| 2B (Carousel) | Igual que 2A | Leer 2A primero si está completo |

---

## Checklist de Calidad por PR

- [ ] Sin datos hardcoded o placeholders en producción
- [ ] `getCurrentUser()` usado en todas las API routes protegidas
- [ ] Tipos de `src/types/index.ts` usados (no tipos inline ad-hoc)
- [ ] Loading states implementados en componentes cliente
- [ ] Empty states con mensajes útiles
- [ ] Sin `console.log` en código de producción
- [ ] Tokens de acceso social siempre cifrados
- [ ] Rate limiting activo en API routes nuevas

# ALFRED — Master Prompt para Claude Code
> Versión: 1.0 | Proyecto: Alfred | Owner: OnIA

---

## VISIÓN DEL PRODUCTO

**Alfred** es un SaaS de gestión de redes sociales con agente IA integrado — como un mayordomo digital para tu marca. Centraliza Instagram, TikTok y LinkedIn en un solo workspace con un agente que genera tareas diarias basadas en métricas y objetivos del usuario, responde preguntas estratégicas, y puede ejecutar acciones (publicar, programar, responder comentarios) según el modo elegido.

El nombre refleja la propuesta de valor: un asistente leal, eficiente y siempre disponible que se encarga de las redes mientras el usuario se enfoca en lo importante.

**Modelo de negocio:** Uso interno OnIA primero → escalar como producto vendible a clientes con arquitectura multi-tenant desde el día uno.

> ⚠️ **LEGAL PENDIENTE — REGISTRAR ANTES DE LANZAMIENTO COMERCIAL**
> El nombre "Alfred" está en uso por meetAlfred.com (herramienta de automatización de LinkedIn/redes sociales).
> Riesgo bajo mientras se opera exclusivamente en Bolivia y Latinoamérica.
> **Acción requerida antes de vender a clientes:**
> 1. Registrar marca "Alfred" en SENAPI (Servicio Nacional de Propiedad Intelectual, Bolivia)
> 2. Verificar conflicto con meetAlfred en mercados objetivo de expansión (EEUU, España)
> 3. Si hay conflicto al escalar: evaluar variantes como "Alfred Social", "Alfred HQ" o "Alfie"

---

## STACK TÉCNICO (no negociable)

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Base de datos:** Supabase (Auth + PostgreSQL + Storage + Realtime)
- **IA:** Claude API — modelo `claude-sonnet-4-20250514` con tool use
- **Automatización:** n8n para cron jobs y workflows de sincronización
- **Deploy:** Vercel
- **APIs sociales:**
  - Meta Graph API v20+ (Instagram Business/Creator)
  - TikTok Content Posting API v2
  - LinkedIn API v2 (Pages + UGC Posts)

---

## RESTRICCIONES REALES DE LAS APIs (leer antes de codear)

### Instagram (Meta Graph API)
- Requiere cuenta Business o Creator vinculada a una Página de Facebook
- Permisos necesarios: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_read_engagement`
- DMs vía API: requieren aprobación adicional de Meta (instagram_manage_messages) — implementar pero marcar como "pendiente de aprobación"
- Rate limit: 200 calls/hora por token
- Video (Reels): usar endpoint de upload resumable, máx 1GB, formato MP4

### TikTok (Content Posting API)
- Requiere cuenta Business o Creator con +1000 seguidores para Content Posting API
- Permisos: `video.publish`, `video.upload`, `comment.list`, `comment.list.manage`
- DMs: TikTok NO tiene API pública de DMs — excluir del scope
- Rate limit: 1000 calls/día

### LinkedIn
- Requiere Company Page para publicar como marca
- Permisos: `w_member_social`, `r_organization_social`, `rw_organization_admin`
- DMs: LinkedIn Messaging API solo disponible para partners certificados — excluir del scope
- Rate limit: 500 calls/día por app

**Conclusión sobre DMs:** Solo Instagram soporta DMs vía API con aprobación. Implementar la UI y lógica, pero mostrar estado "requiere aprobación Meta" hasta obtenerla. TikTok y LinkedIn: sin DMs.

---

## BASE DE DATOS (Supabase — PostgreSQL)

Habilitar RLS en todas las tablas. Toda consulta filtra por `workspace_id`.

```sql
-- Multi-tenant base
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  plan TEXT DEFAULT 'internal', -- internal | starter | pro
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cuentas sociales conectadas
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('instagram', 'tiktok', 'linkedin')),
  account_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  access_token TEXT, -- cifrar con Supabase Vault
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now()
);

-- Objetivos del workspace (base del agente)
CREATE TABLE workspace_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  network TEXT, -- null = objetivo general
  metric TEXT NOT NULL, -- followers | engagement_rate | reach | posts_per_week
  current_value NUMERIC,
  target_value NUMERIC NOT NULL,
  deadline DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversaciones con el agente
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB, -- herramientas usadas por el agente
  agent_mode TEXT CHECK (agent_mode IN ('advisory', 'execution')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tareas diarias generadas por el agente
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('PUBLICAR', 'RESPONDER', 'ANALIZAR', 'OPTIMIZAR', 'CRECER')),
  title TEXT NOT NULL,
  description TEXT,
  network TEXT, -- null = todas las redes
  priority INTEGER CHECK (priority BETWEEN 1 AND 5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  agent_generated BOOLEAN DEFAULT true,
  goal_id UUID REFERENCES workspace_goals(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts programados y publicados
CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  caption TEXT,
  media_urls TEXT[], -- URLs en Supabase Storage
  media_type TEXT CHECK (media_type IN ('image', 'video', 'carousel', 'text')),
  scheduled_at TIMESTAMPTZ,
  networks TEXT[] NOT NULL, -- ['instagram', 'tiktok', 'linkedin']
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  external_ids JSONB, -- {instagram: "xxx", tiktok: "yyy"}
  metrics_snapshot JSONB, -- snapshot de métricas al momento de publicar
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots de analytics (sincronizados cada 6h via n8n)
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  metric_name TEXT NOT NULL, -- followers | likes | comments | shares | reach | impressions | engagement_rate
  value NUMERIC NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ DEFAULT now()
);
```

---

## ESTRUCTURA DE RUTAS (Next.js App Router)

```
/app
  /(auth)
    /login              → Magic link + OAuth
  /(dashboard)          → Layout con sidebar
    /                   → Redirect a /dashboard
    /dashboard          → Vista del día: tareas + resumen agente + métricas clave
    /agent              → Chat completo con el agente
    /tasks              → Gestión de tareas diarias
    /planner            → Calendario de contenido + editor de posts
    /analytics          → Métricas unificadas con gráficas
    /settings
      /accounts         → Conectar/desconectar redes sociales
      /goals            → Definir objetivos por red
      /workspace        → Nombre, plan, configuración general
/api
  /agent/chat           → POST: llamada a Claude API con tool use
  /agent/tasks/generate → POST: generar tareas del día (llamado por n8n)
  /social/callback/[network] → OAuth callback de cada red
  /social/webhook       → Webhooks de Meta (comentarios, DMs)
  /sync/analytics       → POST: sincronizar métricas (llamado por n8n)
  /posts/publish        → POST: publicar post programado (llamado por n8n)
```

---

## AGENTE IA — Especificación Completa

### System Prompt del Agente

```
Eres **Alfred**, el asistente estratégico de gestión de redes sociales para {workspace_name}.
Tu trabajo es ayudar a crecer y gestionar las cuentas de Instagram, TikTok y LinkedIn del usuario.

CONTEXTO ACTUAL (se inyecta en cada llamada):
- Redes conectadas: {connected_networks}
- Objetivos activos: {goals_summary}
- Métricas de los últimos 7 días: {analytics_summary}
- Tareas pendientes hoy: {pending_tasks}
- Últimas 5 publicaciones y su performance: {recent_posts}

MODO ACTUAL: {agent_mode}
- ADVISORY: Solo recomiendas y analizas. No ejecutas acciones.
- EXECUTION: Puedes usar herramientas para publicar, programar y gestionar contenido.

ESTILO DE RESPUESTA:
- Neutro, eficiente y conciso
- Usa datos reales del contexto antes de dar recomendaciones
- Si el usuario pide algo que requiere execution mode y estás en advisory, indícalo claramente
- Prioriza siempre acciones alineadas con los objetivos definidos
- Responde en el idioma en que te escriban (español por defecto)
```

### Herramientas (Tool Use) — Solo activas en Execution Mode

```typescript
const agentTools = [
  {
    name: "schedule_post",
    description: "Programa una publicación en una o varias redes sociales",
    input_schema: {
      caption: "string",
      media_urls: "string[]",
      networks: "('instagram'|'tiktok'|'linkedin')[]",
      scheduled_at: "ISO datetime string"
    }
  },
  {
    name: "create_draft",
    description: "Crea un borrador de publicación sin programar",
    input_schema: {
      caption: "string",
      networks: "string[]",
      notes: "string?"
    }
  },
  {
    name: "get_analytics",
    description: "Obtiene métricas de un período para una o todas las redes",
    input_schema: {
      network: "string? (null = todas)",
      days: "number (7 | 30 | 90)"
    }
  },
  {
    name: "complete_task",
    description: "Marca una tarea diaria como completada",
    input_schema: {
      task_id: "string"
    }
  },
  {
    name: "reply_comment",
    description: "Responde un comentario en Instagram (requiere aprobación Meta para DMs)",
    input_schema: {
      network: "string",
      comment_id: "string",
      reply_text: "string"
    }
  },
  {
    name: "generate_content_ideas",
    description: "Genera ideas de contenido basadas en métricas y objetivos del workspace",
    input_schema: {
      network: "string?",
      count: "number (default 5)",
      content_type: "string? (post|reel|carousel)"
    }
  }
]
```

### Lógica de llamada a Claude API (`/api/agent/chat`)

```typescript
// Siempre incluir en cada llamada:
const contextSummary = await buildAgentContext(workspaceId)
// buildAgentContext() consulta Supabase y devuelve:
// - goals activos
// - métricas últimos 7 días (de analytics_snapshots)
// - tareas pendientes del día
// - últimas 5 publicaciones con metrics_snapshot

// Cargar historial reciente (últimas 20 conversaciones)
const history = await getRecentConversations(workspaceId, 20)

// Llamada a Claude
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: buildSystemPrompt(workspace, contextSummary, agentMode),
  tools: agentMode === 'execution' ? agentTools : [],
  messages: [...history, { role: 'user', content: userMessage }]
})

// Guardar en agent_conversations
await saveConversation(workspaceId, 'user', userMessage)
await saveConversation(workspaceId, 'assistant', response, toolCalls)
```

---

## GENERACIÓN DE TAREAS DIARIAS

Endpoint: `POST /api/agent/tasks/generate` (llamado por n8n a las 7:00 AM)

```typescript
// Lógica de generación:
// 1. Obtener métricas de los últimos 7 días por red
// 2. Obtener objetivos activos y calcular progreso
// 3. Ver días transcurridos sin publicar por red
// 4. Llamar a Claude para generar 3-7 tareas priorizadas

const taskPrompt = `
Analiza los siguientes datos del workspace y genera entre 3 y 7 tareas para hoy.
Responde SOLO con un array JSON.

MÉTRICAS RECIENTES: ${JSON.stringify(recentMetrics)}
OBJETIVOS ACTIVOS: ${JSON.stringify(activeGoals)}
ÚLTIMAS PUBLICACIONES: ${JSON.stringify(recentPosts)}
DÍAS SIN PUBLICAR: Instagram: ${igDays}d | TikTok: ${ttDays}d | LinkedIn: ${liDays}d

Cada tarea debe tener:
- type: PUBLICAR | RESPONDER | ANALIZAR | OPTIMIZAR | CRECER
- title: máximo 60 caracteres, accionable
- description: qué hacer exactamente y por qué (máximo 150 caracteres)
- network: instagram | tiktok | linkedin | null (todas)
- priority: 1 (baja) a 5 (crítica)
- goal_id: UUID del objetivo relacionado o null

Prioriza las tareas que más impactan en los objetivos definidos.
`
```

---

## FASES DE DESARROLLO

### MVP v1 — Uso interno OnIA (prioridad)

**Semana 1-2: Base**
- [ ] Setup Next.js 15 + Supabase + Auth con magic link
- [ ] Schema completo de base de datos con RLS
- [ ] Layout con sidebar + estructura de rutas
- [ ] Página de Settings/Accounts con OAuth flow para Instagram y LinkedIn

**Semana 3-4: Core features**
- [ ] Dashboard: cards de métricas + tareas del día
- [ ] Sincronización manual de analytics (botón "Sync") antes de automatizar
- [ ] Sistema de objetivos: formulario de creación y vista de progreso
- [ ] Tareas diarias: creación manual + generación con agente

**Semana 5-6: Agente**
- [ ] Chat del agente con historial persistente
- [ ] Advisory mode completo con contexto inyectado
- [ ] Execution mode: herramientas schedule_post, create_draft, get_analytics
- [ ] Botón flotante de acceso al agente desde cualquier pantalla

**Semana 7-8: Contenido y video**
- [ ] Editor de posts: texto + imagen + video upload a Supabase Storage
- [ ] Calendario mensual de publicaciones
- [ ] Publicación directa a Instagram y LinkedIn
- [ ] Upload de video para Reels (MP4, endpoint resumable de Meta)
- [ ] TikTok video upload (Content Posting API)

**Semana 9: Automatización**
- [ ] n8n: cron job de generación de tareas (7AM)
- [ ] n8n: sync de analytics cada 6 horas
- [ ] n8n: publicación de posts programados
- [ ] Webhooks de Meta para comentarios

### v2 — Producto vendible

- [ ] Multi-workspace UI (onboarding para nuevos clientes)
- [ ] Billing (definir modelo de pricing y gateway: Libélula o Stripe)
- [ ] DMs de Instagram (post-aprobación Meta)
- [ ] Analytics avanzado: heatmap de mejores horarios, comparativo entre redes
- [ ] Reportes exportables PDF
- [ ] Gestión de comentarios en panel unificado
- [ ] Onboarding guiado para clientes nuevos

---

## SETUP DE APIS SOCIALES (hacer en paralelo al desarrollo)

### Instagram
1. Ir a developers.facebook.com → crear App tipo "Business"
2. Agregar producto "Instagram Graph API"
3. Crear cuenta Instagram Business o Creator
4. Vincular cuenta Instagram a una Página de Facebook
5. En App Review solicitar permisos: `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`
6. Para desarrollo usar Test Users mientras se aprueba la app

### TikTok
1. Ir a developers.tiktok.com → crear app
2. Solicitar acceso a "Content Posting API"
3. Permisos: `video.publish`, `video.upload`, `comment.list.manage`
4. Nota: requiere +1000 seguidores en la cuenta para usar posting API

### LinkedIn
1. Ir a linkedin.com/developers → crear app
2. Asociar app a una LinkedIn Company Page
3. Solicitar productos: "Share on LinkedIn", "Sign In with LinkedIn"
4. Permisos: `w_member_social`, `r_organization_social`

---

## CONSIDERACIONES TÉCNICAS IMPORTANTES

- **Tokens de acceso:** guardar cifrados usando Supabase Vault, nunca en variables de entorno por usuario
- **Rate limits:** nunca hacer calls en tiempo real a las APIs desde el frontend — siempre usar datos cacheados en Supabase actualizados por n8n
- **Video storage:** Supabase Storage con bucket privado, generar signed URLs temporales para el uploader y para la previsualización
- **Streaming del agente:** usar `stream: true` en Claude API + `ReadableStream` en Next.js route handler para respuesta en tiempo real en el chat
- **Contexto del agente:** el `buildAgentContext()` no debe hacer más de 3 queries a Supabase — optimizar con una función RPC o una view materializada
- **DMs de Instagram:** implementar UI y lógica completa, pero mostrar banner "Requiere aprobación Meta" hasta obtenerla — no bloquear el desarrollo por esto
- **TikTok DMs:** no existe API pública — no implementar

---

## NOMBRE DEL PRODUCTO

**Alfred** — asistente/mayordomo digital para la gestión de redes sociales.
Concepto: igual que Alfred es el mayordomo de Batman (eficiente, leal, siempre disponible), este agente gestiona las redes mientras el usuario se enfoca en lo estratégico.

**Dominio sugerido:** `heyalfred.io` / `alfred.social` / `useralfred.com`
(verificar disponibilidad — `alfred.app` y `meetalfred.com` están tomados)

**Estado legal:** pendiente — ver nota en Visión del Producto.
```

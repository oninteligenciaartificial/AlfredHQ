# AlfredHQ — Documentación del Proyecto

> **Versión:** 1.0 | **Estado:** MVP en desarrollo | **Owner:** OnIA

---

## Tabla de Contenidos

1. [Qué Estamos Construyendo](#1-qué-estamos-construyendo)
2. [Propuesta de Valor](#2-propuesta-de-valor)
3. [Funcionalidades](#3-funcionalidades)
4. [Arquitectura Técnica](#4-arquitectura-técnica)
5. [Stack Tecnológico](#5-stack-tecnológico)
6. [Ciberseguridad](#6-ciberseguridad)
7. [Diseño y UX](#7-diseño-y-ux)
8. [Modelo de Negocio y Planes](#8-modelo-de-negocio-y-planes)
9. [Planes a Futuro (Roadmap)](#9-planes-a-futuro-roadmap)
10. [Base de Datos](#10-base-de-datos)
11. [Integraciones con Redes Sociales](#11-integraciones-con-redes-sociales)
12. [Agente IA](#12-agente-ia)
13. [Automatización (n8n)](#13-automatización-n8n)
14. [Despliegue e Infraestructura](#14-despliegue-e-infraestructura)
15. [Consideraciones Legales](#15-consideraciones-legales)
16. [Guía de Desarrollo](#16-guía-de-desarrollo)

---

## 1. Qué Estamos Construyendo

**AlfredHQ** es un SaaS de gestión de redes sociales con agente IA integrado — un mayordomo digital para tu marca. Centraliza **Instagram, TikTok y LinkedIn** en un solo workspace con un agente inteligente que:

- Genera **tareas diarias** basadas en métricas reales y objetivos del usuario
- Responde preguntas estratégicas con contexto del negocio
- Puede **ejecutar acciones** (publicar, programar, responder comentarios) según el modo elegido
- Analiza el rendimiento y recomienda acciones alineadas a los objetivos

El nombre refleja la propuesta de valor: como Alfred, el mayordomo de Batman — eficiente, leal y siempre disponible.

---

## 2. Propuesta de Valor

| Problema | Solución Alfred |
|----------|----------------|
| Gestionar 3+ redes sociales es caótico | Dashboard unificado con todas las métricas |
| No saber qué publicar | Agente IA genera tareas diarias inteligentes |
| Perder tiempo en análisis manual | Analytics automatizados con insights accionables |
| Publicar en horarios óptimos | Programación inteligente basada en datos |
| Responder comentarios tarde | Agente puede responder en modo ejecución |

---

## 3. Funcionalidades

### 3.1 Dashboard Principal
- Vista del día con tareas pendientes
- Resumen del agente IA
- Métricas clave de las últimas 24-48 horas
- Cards de progreso hacia objetivos

### 3.2 Agente IA (Chat)
- Chat conversacional con historial persistente
- **Modo Advisory:** Solo recomienda y analiza
- **Modo Execution:** Ejecuta acciones (publicar, programar, responder)
- Contexto inyectado automáticamente (métricas, objetivos, tareas)
- Acceso flotante desde cualquier pantalla

### 3.3 Gestión de Tareas
- Tareas generadas automáticamente por el agente (7:00 AM)
- Tipos: PUBLICAR, RESPONDER, ANALIZAR, OPTIMIZAR, CRECER
- Priorización inteligente (1-5)
- Vinculación a objetivos del workspace
- Estados: pending, done, skipped

### 3.4 Planner de Contenido
- Calendario mensual de publicaciones
- Editor de posts (texto + imagen + video)
- Programación multi-red (Instagram, TikTok, LinkedIn)
- Estados: draft, scheduled, published, failed
- Upload de video para Reels (MP4, hasta 1GB)

### 3.5 Analytics Unificados
- Métricas por red social
- Snapshots sincronizados cada 6 horas
- Followers, engagement rate, reach, impressions, likes, comments, shares
- Heatmap de mejores horarios (v2)
- Comparativo entre redes (v2)
- Reportes exportables PDF (v2)

### 3.6 Configuración
- **Accounts:** Conectar/desconectar redes sociales (OAuth)
- **Goals:** Definir objetivos por red (followers, engagement, posts/semana)
- **Workspace:** Nombre, plan, configuración general

---

## 4. Arquitectura Técnica

```
+-------------------------------------------------------------+
|                    Frontend (Next.js 16)                     |
|  +----------+ +--------+ +--------+ +--------+ +---------+  |
|  |Dashboard | | Agent  | | Tasks  | |Planner | |Analytics|  |
|  +----------+ +--------+ +--------+ +--------+ +---------+  |
+----------------------------+--------------------------------+
                             |
+----------------------------v--------------------------------+
|                    API Routes (Next.js)                      |
|  +--------------+ +------------+ +------------------------+  |
|  |/api/agent/chat| |/api/posts  | |/api/social/callback/*  |  |
|  |/api/agent/tasks| |/api/sync   | |/api/social/webhook     |  |
|  +--------------+ +------------+ +------------------------+  |
+--------+----------------------+----------------------+-------+
         |                      |                      |
+--------v--------+   +---------v---------+   +--------v------+
|   Supabase      |   |   Claude API      |   |   n8n         |
|  (PostgreSQL)   |   |  (claude-sonnet-4)|   |  (Cron Jobs)  |
|  - Auth         |   |  - Tool Use       |   |  - Task gen   |
|  - Database     |   |  - Streaming      |   |  - Analytics  |
|  - Storage      |   |  - Context inj.   |   |  - Publishing |
|  - RLS          |   +-------------------+   |  - Webhooks   |
+-----------------+                           +---------------+
         |
+--------v-----------------------------------------------------+
|                    Social APIs                                |
|  +------------------+ +----------------+ +----------------+  |
|  |Meta Graph API    | |TikTok Content  | |LinkedIn API v2 |  |
|  |(Instagram)       | |Posting API v2  | |(Pages + UGC)   |  |
|  +------------------+ +----------------+ +----------------+  |
+--------------------------------------------------------------+
```

### 4.1 Estructura de Rutas

```
/app
  /(auth)
    /login                    → Magic link + OAuth
  /(dashboard)
    /dashboard                → Vista del día: tareas + resumen + métricas
    /agent                    → Chat completo con el agente
    /tasks                    → Gestión de tareas diarias
    /planner                  → Calendario de contenido + editor
    /analytics                → Métricas unificadas con gráficas
    /settings
      /accounts               → Conectar/desconectar redes
      /goals                  → Definir objetivos por red
      /workspace              → Configuración general
/api
  /agent/chat                 → POST: Claude API con tool use
  /agent/tasks/generate       → POST: Generar tareas (n8n)
  /social/callback/[network]  → OAuth callback
  /social/webhook             → Webhooks de Meta
  /sync/analytics             → POST: Sync métricas (n8n)
  /posts/publish              → POST: Publicar programado (n8n)
```

---

## 5. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | Next.js + React | 16.2.6 / 19.2.4 |
| **Lenguaje** | TypeScript | 5.x |
| **Estilos** | Tailwind CSS + lucide-react | 4.x |
| **Base de datos** | Supabase (PostgreSQL) | - |
| **Auth** | Supabase Auth (Magic Link + OAuth) | - |
| **Storage** | Supabase Storage | - |
| **IA** | Anthropic Claude API | claude-sonnet-4 |
| **SDK IA** | @anthropic-ai/sdk | 0.95.1 |
| **Validación** | Zod | 4.4.3 |
| **Rate Limiting** | Upstash Redis (prod) / In-memory (dev) | - |
| **Sanitización** | DOMPurify (isomorphic) | 3.12.0 |
| **Automatización** | n8n | - |
| **Deploy** | Vercel | - |

---

## 6. Ciberseguridad

AlfredHQ implementa múltiples capas de seguridad para proteger datos de usuarios y credenciales.

### 6.1 Autenticación y Autorización

- **Supabase Auth** con Magic Link y OAuth social
- **Middleware de protección** en todas las rutas `/dashboard`, `/agent`, `/tasks`, `/planner`, `/analytics`, `/settings`
- **Row Level Security (RLS)** habilitado en todas las tablas de PostgreSQL
- **Verificación de ownership** en cada operación protegida
- **Mass assignment prevention** con allowlists de campos por entidad

### 6.2 Cifrado

- **Tokens de acceso social** cifrados con AES-256-GCM
- **ENCRYPTION_KEY** derivada con scrypt (salt: `alfred-salt`, 32 bytes)
- **IV aleatorio** por cada cifrado + auth tag para integridad
- **Comparación constant-time** para prevenir timing attacks
- **Hash SHA-256** para tokens internos

### 6.3 Protección contra Ataques

| Amenaza | Protección |
|---------|-----------|
| **XSS** | DOMPurify con allowlist estricta de tags/attrs |
| **SQL Injection** | Parámetros parametrizados (Supabase) + detección de patrones peligrosos |
| **Path Traversal** | Sanitización de filenames y paths + validación UUID |
| **SSRF** | Bloqueo de IPs privadas + endpoints de metadata cloud + dominio whitelist |
| **Rate Limiting** | Sliding window con Upstash Redis (prod) o in-memory (dev) |
| **File Upload** | Validación MIME + magic bytes + size limits + EXIF stripping |
| **CSRF** | Cookies HttpOnly + SameSite vía Supabase SSR |
| **Circuit Breaker** | Patrón circuit breaker para servicios externos (umbral: 5 fallos, timeout: 1min) |

### 6.4 Rate Limits

| Tier | Límite | Ventana |
|------|--------|---------|
| Auth | 5 intentos | 15 min |
| Público | 100 req | 1 min |
| Protegido | 200 req | 1 min |
| IA | 10 req | 1 min |
| Export | 5 req | 1 hora |
| Webhook | 50 req | 1 min |
| Upload | 20 req | 1 hora |

### 6.5 Headers de Seguridad

- `X-Request-Id`: UUID único por request
- Bloqueo de rutas sensibles (`/.env`, `/.git`, `/backup`, `/admin`) en producción
- Errores genéricos al cliente (nunca stack traces)
- Audit logging completo de todas las operaciones

### 6.6 File Upload Security

- **Tipos permitidos:** JPEG, PNG, WebP, GIF, MP4, QuickTime, AVI
- **Tamaño máximo:** 10MB imágenes, 1GB videos
- **Validación de magic bytes** para verificar MIME real
- **Detección de scripts en SVG**
- **Filenames seguros** con hash SHA-256 + timestamp
- **Path structure:** `media/{userId}/{year}/{month}/{filename}`
- **EXIF stripping** para imágenes JPEG

### 6.7 SSRF Prevention

- Bloqueo de rangos IP privados (10.x, 172.16-31.x, 192.168.x, 127.x)
- Bloqueo de cloud metadata endpoints (AWS, GCP, Azure, Oracle)
- Solo HTTPS permitido para requests externos
- Timeout de 10 segundos
- Sin redirecciones automáticas

---

## 7. Diseño y UX

### 7.1 Principios de Diseño

- **Minimalista y funcional:** Interfaz limpia con foco en la acción
- **Consistente:** Patrones de diseño uniformes en todas las secciones
- **Responsive:** Adaptado para desktop (prioridad) y mobile

### 7.2 Sistema de Diseño

| Elemento | Implementación |
|----------|---------------|
| **Colores** | Zinc scale (Tailwind) — neutro y profesional |
| **Tipografía** | Geist (optimizada por Next.js) |
| **Iconos** | Lucide React |
| **Layout** | Sidebar izquierda + contenido principal |
| **Navegación** | Sidebar con items activos destacados (bg-zinc-900) |

### 7.3 Estructura Visual

```
+-----------------------------------------------------------+
| AlfredHQ (workspace name)                                 |
+----------+------------------------------------------------+
| Sidebar  |  Header: Título de sección                     |
|          +------------------------------------------------+
| Dashboard|  Contenido principal                            |
| Agente   |                                                 |
| Tareas   |  (cards, tablas, formularios, chat)            |
| Planner  |                                                 |
| Analytics|                                                 |
|          |                                                 |
| Settings |                                                 |
| Logout   |                                                 |
+----------+------------------------------------------------+
```

### 7.4 Estados de UI

- **Active:** bg-zinc-900, text-white
- **Hover:** bg-zinc-100, text-zinc-700
- **Default:** text-zinc-700
- **Danger (logout):** text-red-600, hover:bg-red-50

---

## 8. Modelo de Negocio y Planes

### 8.1 Estrategia de Lanzamiento

1. **Fase 1 — Uso interno OnIA:** Operar con un solo workspace, validar el producto
2. **Fase 2 — Producto vendible:** Multi-tenant con billing y onboarding de clientes

### 8.2 Planes Propuestos

| Característica | Internal | Starter | Pro |
|---------------|----------|---------|-----|
| Workspaces | 1 | 1 | Múltiples |
| Redes sociales | 3 | 3 | 3 |
| Posts/mes | Ilimitado | 50 | Ilimitado |
| Agente IA | Advisory + Execution | Advisory + Execution | Advisory + Execution |
| Analytics | Básico | Básico | Avanzado |
| DMs Instagram | Sí | Sí | Sí |
| Reportes PDF | No | No | Sí |
| Soporte | Directo | Email | Prioritario |
| **Precio** | Gratis | TBD | TBD |

> **Nota:** Pricing por definir. Gateways considerados: Libélula (Bolivia) o Stripe (internacional).

### 8.3 Métricas de Negocio

- MRR (Monthly Recurring Revenue)
- Churn rate
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)
- Activación (conexión de al menos 1 red social)
- Retención (uso activo semanal)

---

## 9. Planes a Futuro (Roadmap)

### 9.1 MVP v1 — Uso Interno OnIA (Semanas 1-9)

| Semana | Hito |
|--------|------|
| 1-2 | Base: Next.js setup, Supabase, Auth, schema DB, layout, OAuth Instagram + LinkedIn |
| 3-4 | Core: Dashboard, sync manual analytics, objetivos, tareas manuales + agente |
| 5-6 | Agente: Chat con historial, advisory mode, execution mode, botón flotante |
| 7-8 | Contenido: Editor de posts, calendario, publicación directa, upload video Reels, TikTok upload |
| 9 | Automatización: n8n cron tasks (7AM), sync analytics (6h), publicación programada, webhooks Meta |

### 9.2 v2 — Producto Vendible

- Multi-workspace UI con onboarding para nuevos clientes
- Billing system (Libélula o Stripe)
- DMs de Instagram (post-aprobación Meta)
- Analytics avanzado: heatmap de mejores horarios, comparativo entre redes
- Reportes exportables PDF
- Gestión de comentarios en panel unificado
- Onboarding guiado para clientes nuevos

### 9.3 v3+ — Escala

- **Nuevas redes:** X/Twitter, Facebook Pages, YouTube
- **AI avanzada:** Generación de copy optimizado, predicción de rendimiento
- **Colaboración:** Multi-user workspaces con roles y permisos
- **API pública:** Para integraciones de terceros
- **White-label:** Para agencias de marketing
- **Mobile app:** React Native o Flutter

---

## 10. Base de Datos

### 10.1 Schema (Supabase — PostgreSQL)

Todas las tablas tienen **RLS habilitado** y filtran por `workspace_id`.

| Tabla | Propósito |
|-------|-----------|
| `workspaces` | Espacios de trabajo multi-tenant |
| `social_accounts` | Cuentas sociales conectadas con tokens cifrados |
| `workspace_goals` | Objetivos del workspace por red |
| `agent_conversations` | Historial de conversaciones con el agente |
| `daily_tasks` | Tareas diarias generadas por el agente |
| `content_posts` | Posts programados y publicados |
| `analytics_snapshots` | Métricas sincronizadas cada 6h |
| `audit_logs` | Registro de auditoría de todas las operaciones |

### 10.2 Funciones RPC

- `get_agent_context(p_workspace_id)` → JSON optimizado con goals, métricas, tareas y posts recientes

### 10.3 Tipos de Datos

- UUIDs para todas las primary keys
- TIMESTAMPTZ para timestamps con timezone
- JSONB para datos flexibles (tool_calls, external_ids, metrics_snapshot, details)
- CHECK constraints para validación de enums

---

## 11. Integraciones con Redes Sociales

### 11.1 Instagram (Meta Graph API v20+)

| Aspecto | Detalle |
|---------|---------|
| **Tipo de cuenta** | Business o Creator vinculada a Facebook Page |
| **Permisos** | `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_read_engagement` |
| **Rate limit** | 200 calls/hora por token |
| **Video/Reels** | Upload resumable, máx 1GB, MP4 |
| **DMs** | Requieren aprobación adicional de Meta |

### 11.2 TikTok (Content Posting API v2)

| Aspecto | Detalle |
|---------|---------|
| **Tipo de cuenta** | Business o Creator con +1000 seguidores |
| **Permisos** | `video.publish`, `video.upload`, `comment.list`, `comment.list.manage` |
| **Rate limit** | 1000 calls/día |
| **DMs** | **No disponible** — API pública no existe |

### 11.3 LinkedIn (API v2)

| Aspecto | Detalle |
|---------|---------|
| **Tipo de cuenta** | Company Page requerida |
| **Permisos** | `w_member_social`, `r_organization_social`, `rw_organization_admin` |
| **Rate limit** | 500 calls/día por app |
| **DMs** | **No disponible** — solo partners certificados |

### 11.4 Resumen de Capacidades

| Función | Instagram | TikTok | LinkedIn |
|---------|-----------|--------|----------|
| Publicar | Sí | Sí | Sí |
| Programar | Sí | Sí | Sí |
| Comentarios | Sí | Sí | Sí |
| DMs | Sí* | No | No |
| Analytics | Sí | Sí | Sí |

> *DMs de Instagram requieren aprobación de Meta.

---

## 12. Agente IA

### 12.1 Modelo

- **Modelo:** `claude-sonnet-4-20250514`
- **Max tokens:** 1024 por respuesta
- **Streaming:** Habilitado para respuesta en tiempo real

### 12.2 Modos de Operación

| Modo | Capacidad |
|------|-----------|
| **Advisory** | Solo recomienda y analiza. No ejecuta acciones. |
| **Execution** | Usa herramientas para publicar, programar y gestionar contenido. |

### 12.3 Contexto Inyectado

En cada llamada al agente se incluye:
- Redes conectadas
- Objetivos activos
- Métricas de los últimos 7 días
- Tareas pendientes hoy
- Últimas 5 publicaciones con su performance

### 12.4 Herramientas (Execution Mode)

| Herramienta | Función |
|-------------|---------|
| `schedule_post` | Programa publicación en una o varias redes |
| `create_draft` | Crea borrador sin programar |
| `get_analytics` | Obtiene métricas (7, 30, 90 días) |
| `complete_task` | Marca tarea como completada |
| `reply_comment` | Responde comentario en Instagram |
| `generate_content_ideas` | Genera ideas basadas en métricas y objetivos |

### 12.5 Generación de Tareas Diarias

- **Trigger:** n8n a las 7:00 AM
- **Endpoint:** `POST /api/agent/tasks/generate`
- **Lógica:**
  1. Obtiene métricas de los últimos 7 días
  2. Calcula progreso de objetivos activos
  3. Verifica días sin publicar por red
  4. Genera 3-7 tareas priorizadas vía Claude

---

## 13. Automatización (n8n)

### 13.1 Workflows

| Workflow | Frecuencia | Función |
|----------|-----------|---------|
| Generación de tareas | 7:00 AM diario | Llama a `/api/agent/tasks/generate` |
| Sync de analytics | Cada 6 horas | Llama a `/api/sync/analytics` |
| Publicación programada | Cada 15 min | Llama a `/api/posts/publish` |
| Webhooks Meta | Event-driven | Recibe comentarios y DMs |

### 13.2 Configuración

- **Webhook URL:** Configurada en `.env` como `N8N_WEBHOOK_URL`
- **Autenticación:** Service role key de Supabase para operaciones internas

---

## 14. Despliegue e Infraestructura

### 14.1 Plataforma

- **Frontend + API:** Vercel
- **Base de datos:** Supabase (cloud)
- **Cache/Rate limit:** Upstash Redis
- **Automatización:** n8n (self-hosted o cloud)
- **Storage:** Supabase Storage (buckets privados)

### 14.2 Variables de Entorno

| Variable | Propósito |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Key de servicio (solo server) |
| `ANTHROPIC_API_KEY` | API key de Claude |
| `META_APP_ID` | App ID de Meta |
| `META_APP_SECRET` | App Secret de Meta |
| `TIKTOK_CLIENT_KEY` | Client key TikTok |
| `TIKTOK_CLIENT_SECRET` | Client secret TikTok |
| `LINKEDIN_CLIENT_ID` | Client ID LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | Client secret LinkedIn |
| `N8N_WEBHOOK_URL` | URL de webhook n8n |
| `ENCRYPTION_KEY` | Key para cifrar tokens |

### 14.3 Consideraciones de Producción

- Tokens de acceso **nunca** en variables de entorno por usuario — usar Supabase Vault
- Rate limits de APIs sociales **nunca** desde frontend — siempre datos cacheados
- Streaming del agente con `ReadableStream` en Next.js route handlers
- `buildAgentContext()` optimizado con RPC o view materializada (máx 3 queries)

---

## 15. Consideraciones Legales

### 15.1 Nombre "Alfred"

> **Riesgo identificado:** El nombre "Alfred" está en uso por **meetAlfred.com** (herramienta de automatización de LinkedIn/redes sociales).

| Acción | Estado |
|--------|--------|
| Operar en Bolivia y Latinoamérica | Riesgo bajo |
| Registrar marca en SENAPI (Bolivia) | **Pendiente — requerido antes de lanzamiento comercial** |
| Verificar conflicto en EEUU/España | **Pendiente** |
| Evaluar variantes si hay conflicto | "Alfred Social", "Alfred HQ", "Alfie" |

### 15.2 Dominios Sugeridos

- `heyalfred.io`
- `alfred.social`
- `useralfred.com`

> `alfred.app` y `meetalfred.com` están tomados.

### 15.3 Compliance

- **GDPR/Ley de Protección de Datos:** Los datos de redes sociales son datos personales
- **Términos de APIs sociales:** Cumplir con rate limits y permisos de cada plataforma
- **Almacenamiento de tokens:** Cifrado obligatorio, no exposición en logs

---

## 16. Guía de Desarrollo

### 16.1 Comandos

```bash
npm run dev      # Desarrollo
npm run build    # Build de producción
npm run start    # Start en producción
npm run lint     # Linting con ESLint
```

### 16.2 Convenciones

- **TypeScript estricto** en todo el proyecto
- **Zod** para validación de schemas en API routes
- **Supabase SSR** para autenticación en middleware y server components
- **RLS** en todas las tablas — nunca confiar en filtrado solo en aplicación
- **Error handling:** `AppError` con códigos, nunca exponer stack traces al cliente

### 16.3 Estructura de Código

```
alfred/
+-- src/
|   +-- app/
|   |   +-- (auth)/login/          -> Autenticación
|   |   +-- (dashboard)/           -> Rutas protegidas
|   |   |   +-- dashboard/         -> Vista principal
|   |   |   +-- agent/             -> Chat IA
|   |   |   +-- tasks/             -> Tareas
|   |   |   +-- planner/           -> Calendario
|   |   |   +-- analytics/         -> Métricas
|   |   |   +-- settings/          -> Configuración
|   |   +-- api/                   -> API routes
|   |   +-- layout.tsx             -> Root layout
|   |   +-- page.tsx               -> Landing/redirect
|   |   +-- error.tsx              -> Error boundary
|   +-- lib/
|   |   +-- supabase/              -> Clientes Supabase
|   |   +-- claude/                -> Cliente IA, tools, prompts
|   |   +-- security/              -> Auth, sanitización, rate limit, SSRF, uploads
|   |   +-- validation/            -> Schemas Zod
|   |   +-- social/                -> Integraciones (LinkedIn, TikTok, Instagram)
|   |   +-- crypto.ts              -> Cifrado
|   |   +-- audit.ts               -> Audit logging
|   |   +-- utils/                 -> Utilidades
|   +-- types/                     -> Tipos TypeScript
+-- .env.example                   -> Variables de entorno
+-- next.config.ts                 -> Configuración Next.js
+-- package.json                   -> Dependencias
+-- tsconfig.json                  -> Configuración TypeScript
```

### 16.4 Próximos Pasos

1. [ ] Setup completo de Next.js + Supabase + Auth
2. [ ] Schema de base de datos con RLS
3. [ ] OAuth flows para Instagram y LinkedIn
4. [ ] Dashboard con métricas y tareas
5. [ ] Agente IA con advisory mode
6. [ ] Execution mode con herramientas
7. [ ] Editor de posts y calendario
8. [ ] Automatización con n8n

---

## Apéndice A: APIs Sociales — Setup

### Instagram (Meta)
1. developers.facebook.com -> crear App tipo "Business"
2. Agregar producto "Instagram Graph API"
3. Vincular Instagram Business a Facebook Page
4. Solicitar permisos en App Review

### TikTok
1. developers.tiktok.com -> crear app
2. Solicitar acceso a "Content Posting API"
3. Nota: requiere +1000 seguidores

### LinkedIn
1. linkedin.com/developers -> crear app
2. Asociar a LinkedIn Company Page
3. Solicitar productos: "Share on LinkedIn", "Sign In with LinkedIn"

---

## Apéndice B: Decisiones Técnicas

| Decisión | Razón |
|----------|-------|
| Supabase sobre Firebase | PostgreSQL nativo, RLS, mejor para datos relacionales |
| Claude sobre GPT | Mejor tool use, contexto más largo, más predecible |
| n8n sobre cron nativo | Visual, reintentos automáticos, monitoring |
| Next.js App Router | Server components, mejor DX, futuro de React |
| Tailwind CSS | Utility-first, consistente, rápido |
| Upstash Redis | Serverless, compatible con Vercel, sin infra |

---

*Documento generado el 10 de mayo de 2026. Última actualización: v1.0*

# Bolivia Payments Research — AlfredHQ

> Estado: Sin NIT / empresa no constituida formalmente
> Objetivo: Cobrar suscripciones SaaS a usuarios bolivianos

---

## 1. Resumen Ejecutivo

Sin NIT, no se puede emitir facturas oficiales ni usar pasarelas de pago corporativas. Sin embargo, hay opciones viables para empezar a cobrar y validar el modelo antes de formalizar.

---

## 2. Opciones Sin NIT

### 2.1 Pagos QR Interbancario (Recomendado para inicio)

**Cómo funciona:**
- Generas QR de tu cuenta bancaria personal (Banco Unión, BNB, Banco Sol, etc.)
- Usuario escanea con cualquier app bancaria boliviana
- Pago llega a tu cuenta en minutos

**Pros:**
- Sin NIT requerido
- Cero comisiones entre bancos bolivianos
- Funciona desde app banca móvil personal
- Interoperabilidad total (todos los bancos bolivianos desde ~2022)

**Contras:**
- Manual: debes verificar transferencia manualmente o via webhook
- No hay API pública oficial para QR dinámico (excepto Banco Unión con cuenta empresarial)
- Conciliación manual complicada a escala

**Implementación técnica:**
```
Flujo: 
1. Usuario selecciona plan → genera referencia única (uuid corto)
2. Muestra QR estático de tu cuenta + referencia en descripción
3. Usuario transfiere con referencia
4. Tú verificas manualmente (o via scraping bancario)
5. Activas suscripción manualmente o con n8n webhook
```

---

### 2.2 Tigo Money (Sin NIT posible)

**Qué es:** Billetera móvil de Tigo Bolivia. Persona natural puede recibir pagos.

**Cómo funciona:**
- Cuenta Tigo Money personal (CI boliviano suficiente)
- API para comercios EXISTE pero requiere contrato con Tigo
- Sin contrato: solo cobros manuales vía número de billetera

**Límites cuenta personal:**
- Recepción: hasta Bs. 50,000/mes
- Acumulado: hasta Bs. 100,000

**Integración posible:**
- Tigo Money for Business API (requiere NIT o RUC)
- Sin NIT: solo manual o scraping de SMS/notificaciones

---

### 2.3 PayPal (Internacional, sin NIT)

**Factibilidad Bolivia:**
- PayPal Bolivia está **muy limitado** — no se puede enviar dinero, solo recibir en algunos casos
- Cuenta personal boliviana: RECIBIR es posible si el pagador envía desde exterior
- Retirar a banco boliviano: no directo, requiere intermediarios (Payoneer, etc.)

**Veredicto:** Útil solo si tienes usuarios bolivianos con tarjeta internacional o si ellos pagan desde el extranjero.

---

### 2.4 Stripe (Internacional)

**Bolivia:** Stripe NO opera en Bolivia como país de registro. No puedes crear cuenta Stripe con dirección Bolivia.

**Workaround:**
- Cuenta Stripe en otro país (USA, UK, etc.) via Stripe Atlas o similar
- Requiere dirección, banco y documentos extranjeros
- Costoso y complejo para inicio

**Veredicto:** No viable sin estructura en otro país.

---

### 2.5 Mercado Pago

**Bolivia:** Mercado Pago tiene presencia limitada en Bolivia. Principalmente para compradores, no vendedores. No hay versión para comercios bolivianos equivalente a Argentina/Mexico.

**Veredicto:** No viable actualmente.

---

### 2.6 Scraping Bancario (Verificación de pagos)

**Concepto:** Automatizar verificación de transferencias monitoreando tu cuenta bancaria sin API oficial.

**Opciones:**

#### A) Scraping de banca en línea
- Banco Unión, BNB, Banco Sol tienen web bancaria
- Playwright/Puppeteer puede leer historial de transacciones
- **Riesgos:** 
  - Viola TOS del banco
  - 2FA puede bloquear acceso automatizado
  - Cambios en UI rompen el scraper
  - Potencial cierre de cuenta

#### B) Lectura de notificaciones SMS/Email
- La mayoría de bancos bolivianos envían SMS o email por cada depósito
- Leer correo (Gmail API) es LEGAL y confiable
- SMS requiere número dedicado con acceso programático (Twilio, etc.)

**Implementación recomendada (Gmail):**
```
1. Cuenta bancaria → notificaciones por email habilitadas
2. Gmail API → leer emails del banco en tiempo real
3. n8n workflow → parsear email, extraer monto + referencia
4. Verificar contra pedido pendiente
5. Activar suscripción automáticamente
```

**Ejemplo patrón email Banco Unión:**
```
Asunto: Depósito recibido
Cuerpo: Se ha acreditado Bs. 150.00 en su cuenta. Referencia: ALFR-xxxx
```

---

## 3. Estrategia Recomendada (Sin NIT)

### Fase 1: Manual + QR (0-50 clientes)

```
Flujo:
1. Landing page con planes
2. "Pagar ahora" → Modal con QR + cuenta + instrucciones
3. Referencia única: ALFRED-{userId}-{plan}
4. Usuario transfiere y envía captura por WhatsApp/formulario
5. Tú activas manualmente en dashboard admin
```

**Implementación en AlfredHQ:**
- Tabla `manual_payments` en Supabase
- Admin panel para aprobar pagos
- Email automático de confirmación al aprobar

**Tiempo setup:** 1-2 días

---

### Fase 2: Semi-automático via Email parsing (50-200 clientes)

```
Flujo:
1. Usuario paga con referencia única
2. Banco envía email de confirmación a tu cuenta
3. n8n webhook lee Gmail → parsea monto + referencia
4. Verifica en DB → activa suscripción automáticamente
5. Usuario recibe email de activación
```

**Componentes:**
- Gmail API credentials
- n8n workflow "payment-detector"
- Supabase función de activación de suscripción

**Tiempo setup:** 2-3 días

---

### Fase 3: Con NIT (200+ clientes)

- Tramitar NIT (persona natural con CI boliviano puede tener NIT)
- Banco Unión API QR para comercios
- O integrar Kushki (pasarela que opera en Bolivia con NIT)

---

## 4. NIT — Aclaración Importante

**NIT persona natural SÍ es posible sin empresa:**
- Cualquier ciudadano boliviano puede tramitar NIT como persona natural
- Requisito: CI boliviano + formulario en oficinas de impuestos (SIN)
- Costo: Gratuito
- Tiempo: 1 día

**Esto habilita:**
- Emitir facturas legalmente
- Usar Banco Unión API QR comercios
- Potencialmente Kushki (verificar)

**Pregunta clave:** ¿Tienes CI boliviano? Si sí, tramitar NIT persona natural es el siguiente paso lógico antes de escalar.

---

## 5. Pasarelas con Cobertura Bolivia

| Pasarela | Bolivia | NIT requerido | Notas |
|----------|---------|---------------|-------|
| Banco Unión QR API | ✅ | Empresarial | Mejor opción con NIT |
| Kushki | ✅ parcial | Sí | Verificar disponibilidad |
| Conekta | ❌ | - | Solo México |
| Stripe | ❌ | - | No acepta Bolivia |
| PayPal | ⚠️ | No | Solo recibir internacional |
| Tigo Money API | ✅ | Contrato Tigo | Requiere negociación |
| Mercado Pago | ❌ | - | No para vendedores BO |
| Paymentez | ✅ | Verificar | Opera en región |

---

## 6. Plan de Implementación Inmediato

### Sprint 1 (Esta semana): Manual payments

```typescript
// Tabla en Supabase
manual_payments {
  id: uuid
  workspace_id: uuid → workspaces.id
  plan: 'starter' | 'pro' | 'agency'
  amount_bs: decimal
  reference: string  // ALFRED-{workspaceId}-{timestamp}
  status: 'pending' | 'approved' | 'rejected'
  payment_proof_url: string?  // captura subida por usuario
  approved_by: uuid?
  approved_at: timestamp?
  created_at: timestamp
}
```

### Admin panel mínimo:
- Lista de pagos pendientes
- Botón "Aprobar" → activa suscripción workspace
- Botón "Rechazar" → notifica usuario

### QR en frontend:
- Imagen QR estática de tu cuenta
- Número de cuenta para transferencia
- Referencia generada dinámicamente por usuario

---

## 7. Siguientes Pasos

- [ ] Confirmar: ¿tienes CI boliviano para NIT persona natural?
- [ ] Habilitar notificaciones email en tu cuenta bancaria
- [ ] Implementar tabla `manual_payments` en schema Supabase
- [ ] Crear admin panel simple para aprobar pagos
- [ ] Generar QR de tu cuenta bancaria
- [ ] Configurar n8n workflow para email parsing (Fase 2)

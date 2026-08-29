# Análisis de Riesgos y Posibles Errores - Finanzia
## Basado en revisión de código y flujo E2E

---

## 🔴 ERRORES CRÍTICOS (Deben corregirse antes de producción)

### Error Crítico #1: Instituciones sin nombre muestran UUID en Protección

**Severidad:** 🔴 CRÍTICO

**Descripción:**
Cuando una institución no tiene campo `name` en la BD, ProfilePage muestra el UUID en lugar de un nombre legible.

**Ubicación del código:**
- `src/ProfilePage.tsx` líneas 103-180
- `server/index.js` línea 366 (GET /api/institutions)

**Causa raíz:**
En el useEffect de ProfilePage, si `institution.name` es undefined, se usa `institutionNameMap[institution.id]` que no está definida.

**Impacto:**
- Experiencia de usuario pobre
- Confusión al ver UUIDs en lugar de nombres
- Looks unprofessional

**Cómo reproducir:**
1. Agregar institución sin llenar campo `name` en BD (si es posible)
2. Ir a Protección
3. Ver UUID en lugar de nombre

**Fix propuesto:**
```typescript
// En ProfilePage.tsx, useEffect
if (institution.name) {
  institutionNameMap[institution.id] = institution.name;
} else {
  // Fallback: usar el ID formateado
  institutionNameMap[institution.id] = institution.id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
```

**Prioridad:** Inmediata

**Estado:** ✅ Parcialmente arreglado (podría mejorar)

---

### Error Crítico #2: Productos sin nombre muestran UUID

**Severidad:** 🔴 CRÍTICO

**Descripción:**
Si un producto no tiene campo `name`, Protección muestra el productId UUID.

**Ubicación:**
- `src/ProfilePage.tsx` línea 378
- Los tabs muestran: `<span>{productName}</span>`

**Causa raíz:**
```typescript
const productName = productNames[config.institutionId]?.[config.productId] || config.productId
```

Si `product.name` no existe en BD, fallback es `config.productId` que puede ser UUID.

**Cómo reproducir:**
1. Agregar producto sin llenar campo `name`
2. Ir a Protección
3. Ver UUID en lugar de nombre

**Fix propuesto:**
Asegurar que SIEMPRE se guarde `product.name` en BD al crear producto.

**Prioridad:** Inmediata

**Estado:** ✅ Parcialmente arreglado

---

### Error Crítico #3: Cálculos inexactos en Dashboard

**Severidad:** 🔴 CRÍTICO

**Descripción:**
Los cálculos mostrados en Dashboard podrían no ser exactos si:
- Las fórmulas no se aplican correctamente
- Hay redondeo inconsistente
- Tax rate no se aplica

**Ubicación:**
- `src/DashboardPage.tsx` línea 120+
- `src/calculationEngine.ts`

**Ejemplo:**
Para Klark Cuenta Ahorro con $100k @ 11.5%:
- Calculado: 100000 * 0.115 / 365 = $31.51/día
- Si se muestra: $3.01/día → **ERROR DE CÁLCULO**

**Cómo verificar:**
1. Crear inversión en Klark
2. Dashboard muestra rendimiento diario
3. Calcular manualmente:
   - Para $50k @ 11%: 50000 * 0.11 / 365 = $15.07
   - Para $50k @ 5%: 50000 * 0.05 / 365 = $6.85
   - Total esperado: $21.92/día
4. Comparar con lo mostrado

**Causa probable:**
- Método de cálculo incorrecto
- Variable no actualizada desde BD
- Fórmula aplicada incorrectamente

**Fix propuesto:**
Revisar `calculateInvestment()` en DashboardPage.tsx:
```typescript
const dailyYield = configuredCompoundInterest(promoBalance, annualRate, 1) +
                   configuredCompoundInterest(excessBalance, excessRate, 1);
```

**Prioridad:** CRÍTICA - Los usuarios confiarán en estos números

**Estado:** ⚠️ Revisar manualmente

---

### Error Crítico #4: Cambios en Protección no se aplican inmediatamente

**Severidad:** 🔴 CRÍTICO

**Descripción:**
Cuando usuario cambiar tasa en Protección de 11% a 11.5%, Dashboard podría seguir usando 11% hasta recargar la página.

**Ubicación:**
- `src/ProfilePage.tsx` línea 268 (saveUserConfig)
- `src/DashboardPage.tsx` línea 80 (cargar inversiones)

**Causa raíz:**
El Dashboard no sabe que config cambió. Necesita refetch de `/api/user-config` y luego recalcular.

**Cómo reproducir:**
1. Dashboard abierto en una pestaña
2. Protección abierto en otra pestaña
3. Cambiar tasa en Protección
4. Regresar a Dashboard
5. ¿Se actualiza automáticamente? → NO (probablemente)

**Fix propuesto:**
Opción 1: Refetch automático cada minuto
```typescript
// En DashboardPage
useEffect(() => {
  const interval = setInterval(() => {
    fetchInvestmentsAndUserConfigs();
  }, 60000); // 60 segundos
  return () => clearInterval(interval);
}, []);
```

Opción 2: Event listener / WebSocket
```typescript
// Emitir evento cuando se guarda config
window.dispatchEvent(new Event('user-config-updated'));

// En Dashboard, escuchar
useEffect(() => {
  window.addEventListener('user-config-updated', refetch);
  return () => removeEventListener('user-config-updated', refetch);
}, []);
```

**Prioridad:** Alta

**Estado:** ⚠️ Por revisar

---

## 🟡 ERRORES ALTOS (Importante corregir)

### Error Alto #1: No hay validación de datos en formulario Nueva Institución

**Severidad:** 🟡 ALTO

**Descripción:**
El formulario de agregar institución no valida:
- Campo nombre vacío
- Sitio web formato incorrecto
- Caracteres especiales problemáticos

**Impacto:**
- Institución con nombre vacío
- URLs inválidas guardadas
- Datos corruptos en BD

**Cómo reproducir:**
1. Ir a /instituciones
2. Agregar institución
3. Dejar "Nombre" vacío
4. Click "Guardar"

**Resultado esperado:** Error validación
**Resultado actual:** Se guarda (probablemente)

**Fix propuesto:**
Agregar validación en App.tsx:
```typescript
const saveInstitution = (institution: Institution) => {
  if (!institution.name?.trim()) {
    alert('El nombre es requerido');
    return;
  }
  if (institution.website && !isValidURL(institution.website)) {
    alert('URL inválida');
    return;
  }
  // Guardar...
};
```

**Prioridad:** Alta

**Estado:** ⚠️ Por revisar

---

### Error Alto #2: No hay validación en Nueva Inversión

**Severidad:** 🟡 ALTO

**Descripción:**
InvestmentPage no valida:
- Saldo inicial negativo
- Saldo inicial = 0
- Fecha futura
- Fecha anterior a hoy hace 10 años

**Impacto:**
- Cálculos incorrectos
- Datos sin sentido en BD

**Cómo reproducir:**
1. Nueva Inversión
2. Saldo inicial: -100
3. Click "Agregar"

**Fix propuesto:**
```typescript
const validateInvestment = () => {
  if (balance <= 0) throw new Error('Balance debe ser > 0');
  if (new Date(startDate) > new Date()) throw new Error('Fecha no puede ser futura');
  if (daysElapsed > 365 * 50) throw new Error('Fecha muy antigua');
};
```

**Prioridad:** Alta

**Estado:** ⚠️ Por revisar

---

### Error Alto #3: Retiro de dinero puede ser mayor que balance

**Severidad:** 🟡 ALTO

**Descripción:**
Cuando editas inversión y pones "Dinero retirado" > balance total, los cálculos se rompen.

**Ejemplo:**
- Balance: $100k
- Retirado: $150k
- Saldo disponible: -$50k ← NEGATIVO

**Impacto:**
- Rendimientos diarios negativos (incorrectos)
- Cálculos sin sentido

**Cómo reproducir:**
1. Crear inversión $100k
2. Editar, poner retirado = $150k
3. Dashboard muestra números negativos

**Fix propuesto:**
En InvestmentPage:
```typescript
const maxWithdrawal = balance - previousWithdrawal;
if (newWithdrawal > maxWithdrawal) {
  alert(`No puedes retirar más de $${maxWithdrawal}`);
  return;
}
```

**Prioridad:** Alta

**Estado:** ⚠️ Por revisar

---

### Error Alto #4: Base de datos no sincroniza instituciones duplicadas

**Severidad:** 🟡 ALTO

**Descripción:**
Si usuario crea dos instituciones con mismo nombre, la BD podría:
- Crear duplicados (confusión)
- Sobreescribir la primera
- Mostrar inconsistencias

**Ubicación:**
- `server/index.js` línea 380 (INSERT... ON CONFLICT)

**Cómo reproducir:**
1. Agregar "Klark test"
2. Agregar otra "Klark test"
3. Ver qué sucede

**Fix propuesto:**
Agregar unique constraint en BD:
```sql
ALTER TABLE institutions ADD CONSTRAINT institutions_name_unique UNIQUE(name);
```

O en aplicación:
```javascript
const existingName = await pool.query('SELECT id FROM institutions WHERE name = $1', [name]);
if (existingName.rows.length) {
  return response.status(409).json({ error: 'Institución con ese nombre ya existe' });
}
```

**Prioridad:** Alta

**Estado:** ⚠️ Por revisar

---

## 🟢 ERRORES MEDIOS (Mejorar cuando sea posible)

### Error Medio #1: No hay indicador visual de cuándo se actualizó por última vez

**Severidad:** 🟢 MEDIO

**Descripción:**
En Dashboard, no se muestra:
- "Calculado a las 15:30"
- "Datos frescos de hace 5 minutos"
- Botón "Refrescar ahora"

**Impacto:**
- Usuario no sabe si datos son actuales
- No sabe si recargar para nuevos datos

**Fix propuesto:**
Agregar en Dashboard:
```typescript
<small>Calculado a: {calculatedAt}</small>
<button onClick={() => refetchInvestments()}>🔄 Refrescar</button>
```

**Prioridad:** Media

**Estado:** ℹ️ Sugerencia

---

### Error Medio #2: No hay confirmación al editar tasa grande

**Severidad:** 🟢 MEDIO

**Descripción:**
Si cambias tasa de 5% a 50%, no hay confirmación. Podría ser error.

**Fix propuesto:**
```typescript
if (Math.abs(newRate - oldRate) > 5) {
  if (!confirm(`¿Cambiar tasa de ${oldRate}% a ${newRate}%?`)) return;
}
```

**Prioridad:** Media

**Estado:** ℹ️ Sugerencia

---

### Error Medio #3: Falta de audit log

**Severidad:** 🟢 MEDIO

**Descripción:**
No se registra quién cambió qué y cuándo:
- Tasa cambió de 11% a 11.5%
- Institución creada
- Producto eliminado

**Fix propuesto:**
Agregar tabla `audit_log` en BD:
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

**Prioridad:** Media (pero importante para compliance)

**Estado:** ℹ️ Sugerencia

---

### Error Medio #4: No hay manejo de errores de red

**Severidad:** 🟢 MEDIO

**Descripción:**
Si se pierde conexión a internet mientras guardas config, no hay retry automático.

**Ubicación:**
- `src/ProfilePage.tsx` línea 268 (saveUserConfig)

**Fix propuesto:**
```typescript
const saveUserConfig = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch("/api/user-config", { ... });
      if (response.ok) return;
      // Error del servidor
      throw new Error(data.error);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

**Prioridad:** Media

**Estado:** ℹ️ Sugerencia

---

## 🔵 ERRORES BAJOS (Nice-to-have)

### Error Bajo #1: Falta de animaciones en cambios

**Severidad:** 🔵 BAJO

**Descripción:**
Cuando cambias tasa, cambio es instantáneo sin feedback visual.

**Mejora:**
Agregar transición suave, cambio de color, etc.

---

### Error Bajo #2: Números sin separador de miles

**Severidad:** 🔵 BAJO

**Descripción:**
Dashboard muestra: `100000` en lugar de `$100,000.00`

**Ubicación:**
- `src/DashboardPage.tsx` línea 70 (money formatter)

**Nota:** Parece estar implementado, pero revisar si aplica globalmente

---

### Error Bajo #3: Falta de modo oscuro

**Severidad:** 🔵 BAJO

**Descripción:**
No hay tema oscuro (nice-to-have)

---

## 📊 MATRIZ DE RIESGOS

```
SEVERIDAD vs PROBABILIDAD

         │  Baja    │  Media   │   Alta
─────────┼──────────┼──────────┼──────────
CRÍTICO  │   E5     │   E1,2,3 │   E4
         │          │   E6     │
─────────┼──────────┼──────────┼──────────
ALTO     │   E8,9   │   E10,11 │   E7
─────────┼──────────┼──────────┼──────────
MEDIO    │   E12,13 │   E14    │
─────────┼──────────┼──────────┼──────────
BAJO     │   E15,16 │          │
─────────┴──────────┴──────────┴──────────

Prioridad (Crítico + Alta Probabilidad): E1, E2, E3, E4, E6
```

---

## ✅ CHECKLIST DE VALIDACIÓN PRE-PRODUCCIÓN

### Antes de hacer deploy:

- [ ] **E1 & E2:** Verificar que nombres de instituciones y productos se muestran correctamente
- [ ] **E3:** Hacer cálculo manual y comparar con Dashboard
- [ ] **E4:** Cambiar tasas en Protección y verificar que Dashboard se actualiza al recargar
- [ ] **E5:** Intentar crear institución sin nombre → Debe rechazarse
- [ ] **E6:** Intentar crear inversión con balance negativo → Debe rechazarse
- [ ] **E7:** Intentar retirar más que el balance → Debe rechazarse
- [ ] **E8:** Crear dos instituciones con mismo nombre → Debe prevenir duplicado
- [ ] **E9:** Verificar que no hay errores en console (F12)
- [ ] **E10:** Verificar todas las peticiones HTTP son 200 OK
- [ ] **E11:** Testing en navegadores: Chrome, Firefox, Safari
- [ ] **E12:** Audit log implementado (opcional pero recomendado)

---

## 🎯 ACCIONES RECOMENDADAS

### Inmediato (Antes de producción):
1. ✅ Corregir E1, E2, E3, E4 (CRÍTICOS)
2. ✅ Agregar validación en formularios (E5, E6, E7, E8)
3. ✅ Verificar cálculos manualmente

### Corto plazo (Primera semana):
1. Implementar retry automático (E9)
2. Agregar indicador de "último actualizado"
3. Agregar confirmación de cambios grandes

### Mediano plazo (Primer mes):
1. Implementar audit log
2. Agregar tema oscuro
3. Optimizar performance de Dashboard

### Largo plazo:
1. WebSocket para actualizaciones en tiempo real
2. Notificaciones push
3. Mobile app

---

## 📝 CONCLUSIÓN

**Estado General:** ⚠️ REQUIERE FIXES ANTES DE PRODUCCIÓN

**Bloqueadores críticos:**
- E1, E2, E3, E4 deben resolverse

**Recomendación:**
- NO deploy a producción hasta que E1-E8 estén resueltos
- Hacer testing E2E completo según plan en PLAN_PRUEBAS_E2E_REGRESION.md
- Revisar cálculos matemáticos manualmente


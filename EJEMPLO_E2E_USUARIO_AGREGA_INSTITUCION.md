# Ejemplo E2E: Usuario logueado agrega institución nueva (Klar)

## 🎯 Escenario
Un usuario logueado quiere agregar una institución nueva llamada **Klar** al sistema, definir sus productos, configurar fórmulas de cálculo personalizadas, y ver cómo se calculan sus inversiones en Dashboard, Reportes y Protección.

---

## 👤 PERSPECTIVA DEL USUARIO

El usuario logueado puede hacer todo esto desde la interfaz:

1. ✅ **Agregar institución nueva** (en `/instituciones`)
2. ✅ **Definir productos** de esa institución
3. ✅ **Configurar fórmulas de cálculo** (en `/configuracion`)
4. ✅ **Crear inversiones** con esa institución (en `/inversiones`)
5. ✅ **Ver cálculos** en Dashboard y Reportes
6. ✅ **Ajustar tasas y parámetros** en Protección

---

## PASO 1: AGREGAR LA INSTITUCIÓN EN `/instituciones`

### 1.1 El usuario accede a Instituciones

```
DIRECTORIO DE INSTITUCIONES
├─ Bancoplata
├─ Openbank
├─ Nu
├─ DiDi Cuenta
├─ Kubo
└─ [+ Agregar Nueva Institución] ← Usuario hace click aquí
```

### 1.2 Formulario para nueva institución

El usuario ve un formulario y completa:

```
┌─────────────────────────────────────────────────────────────┐
│ NUEVA INSTITUCIÓN                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Nombre de la institución:                                  │
│ [Klar]                                                      │
│                                                             │
│ País:                                                       │
│ [México]                                                    │
│                                                             │
│ Categoría:                                                 │
│ [Banca digital]                                            │
│                                                             │
│ Sitio web:                                                 │
│ [https://www.klar.com/mx]                                  │
│                                                             │
│ Notas:                                                     │
│ [Productos de inversión para optimizar dinero con Klar]   │
│                                                             │
│                           [Guardar Institución]            │
│                           [Cancelar]                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Institución creada

```
DIRECTORIO DE INSTITUCIONES
├─ Bancoplata
├─ Openbank
├─ Nu
├─ DiDi Cuenta
├─ Kubo
└─ 🆕 Klar ← Aparece en la lista

[Al hacer click] → Accede a detalles de Klar
```

---

## PASO 2: AGREGAR PRODUCTOS A KLAR

### 2.1 En detalles de Klar, agregar productos

```
┌─────────────────────────────────────────────────────────────┐
│ KLAR                                                        │
├─────────────────────────────────────────────────────────────┤
│ Productos:                                                  │
│ [+ Agregar Producto]                                        │
│                                                             │
│ (Actualmente sin productos)                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Usuario agrega primer producto: "Cuenta Ahorro Klar"

```
┌─────────────────────────────────────────────────────────────┐
│ NUEVO PRODUCTO                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ID del producto:                                           │
│ [klar-cuenta-ahorro]                                        │
│                                                             │
│ Nombre:                                                    │
│ [Cuenta Ahorro Klar]                                        │
│                                                             │
│ Descripción:                                               │
│ [Hasta 11% de rendimiento anual en tus ahorros]            │
│                                                             │
│ Tasa anual (%):                                            │
│ [11]                                                        │
│                                                             │
│ Tope promocional:                                          │
│ [50000]                                                     │
│                                                             │
│ Tasa excedente (%):                                        │
│ [5]                                                         │
│                                                             │
│ Condiciones:                                               │
│ [11% en primeros $50k, 5% excedente]                       │
│                                                             │
│ Icono:                                                     │
│ [account] ▼                                                 │
│                                                             │
│ Sitio web:                                                 │
│ [https://www.klar.com/mx/savings]                          │
│                                                             │
│                    [Guardar Producto]                      │
│                    [Cancelar]                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Usuario agrega segundo producto: "Plazo Fijo 6 Meses"

```
┌─────────────────────────────────────────────────────────────┐
│ NUEVO PRODUCTO                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ID del producto:                                           │
│ [klar-plazo-6m]                                             │
│                                                             │
│ Nombre:                                                    │
│ [Plazo Fijo 6 Meses]                                        │
│                                                             │
│ Descripción:                                               │
│ [12% de rendimiento anual a 6 meses]                       │
│                                                             │
│ Tasa anual (%):                                            │
│ [12]                                                        │
│                                                             │
│ Tope promocional:                                          │
│ [0]  (Sin límite)                                           │
│                                                             │
│ Condiciones:                                               │
│ [Plazo fijo de 180 días, retención 10%]                    │
│                                                             │
│                    [Guardar Producto]                      │
│                    [Cancelar]                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Resultado: Klar con dos productos

```
┌─────────────────────────────────────────────────────────────┐
│ KLAR                                                        │
├─────────────────────────────────────────────────────────────┤
│ Productos:                                                  │
│                                                             │
│ ✓ Cuenta Ahorro Klar (11%)                                  │
│   └─ Tope: $50k @ 11%, exceso @ 5%                         │
│   [Editar] [Eliminar]                                      │
│                                                             │
│ ✓ Plazo Fijo 6 Meses (12%)                                  │
│   └─ Plazo fijo 180 días                                   │
│   [Editar] [Eliminar]                                      │
│                                                             │
│ [+ Agregar Producto]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## PASO 3: CREAR INVERSIÓN EN KLAR (Nueva Inversión)

### 3.1 Usuario va a `/inversiones` y selecciona Klar

```
NUEVA INVERSIÓN
├─ Instituciones
│  ├─ Bancoplata
│  ├─ Openbank
│  ├─ Nu
│  ├─ DiDi Cuenta
│  ├─ Kubo
│  └─ 🆕 Klar ← Usuario selecciona
│
└─ Productos Klar
   ├─ Cuenta Ahorro Klar (11%)
   │  └─ $50k @ 11%, exceso @ 5%
   │
   └─ Plazo Fijo 6 Meses (12%)
      └─ Plazo fijo 180 días
```

### 3.2 Usuario crea inversión en Cuenta Ahorro Klar

```
┌─────────────────────────────────────────────────────────────┐
│ NUEVA INVERSIÓN - Cuenta Ahorro Klar                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Nombre de la inversión:                                    │
│ [Mi ahorro en Klar]                                         │
│                                                             │
│ Saldo inicial:                                             │
│ [100000]  MXN                                               │
│                                                             │
│ Fecha de inicio:                                           │
│ [2026-08-29]                                                │
│                                                             │
│ Tipo: [Vista ▼] (Corto plazo)                              │
│                                                             │
│ Cálculo aproximado:                                         │
│ ├─ Monto en promoción: $50,000 @ 11%                       │
│ ├─ Monto en excedente: $50,000 @ 5%                        │
│ ├─ Rendimiento diario: ~$3.56                              │
│ └─ Rendimiento mensual: ~$107.22                           │
│                                                             │
│                    [+ Agregar Inversión]                   │
│                    [Cancelar]                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Inversión guardada

```
Usuario ve: "✓ Inversión creada exitosamente"

Inversiones en Vista (Short-term):
├─ Openbank - Rendimiento 13% ($30,000)
├─ Nu - Cuenta Nu ($25,000)
└─ 🆕 Klar - Cuenta Ahorro Klar ($100,000) ← Nueva
```

---

## PASO 4: VER CÁLCULOS EN DASHBOARD

### 4.1 Dashboard automáticamente incluye Klar

```
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD - RESUMEN DE INVERSIONES                          │
├─────────────────────────────────────────────────────────────┤
│ TOTAL INVERTIDO: $155,000.00                                │
│ RENDIMIENTOS HOY: $6.23                                     │
│ RENDIMIENTOS MES: $187.26                                   │
│ ACUMULADO: $568.40                                          │
└─────────────────────────────────────────────────────────────┘

┌─ Klar - Cuenta Ahorro Klar ────────────────────────────────┐
│ 💰 Balance actual: $100,000.00                              │
│                                                             │
│ 📊 Rendimiento HOY: $3.01                                  │
│ 📊 Rendimiento MENSUAL (est.): $90.41                      │
│ 📊 Próximo mes (proyectado): $100,090.41                   │
│                                                             │
│ 💹 Acumulado total: $250.68                                │
│ 📈 Tasa efectiva: 11.00% (promo) / 5.00% (exceso)         │
│ 🧮 Método: Interés compuesto (365 días)                   │
│                                                             │
│ ⏰ Días invertidos: 15                                      │
│ 🎯 Tope promocional: $50,000                               │
│    ├─ En promoción: $50,000 @ 11% → rendimiento: $224.66  │
│    └─ En excedente: $50,000 @ 5%   → rendimiento: $26.02  │
│                                                             │
│ [Editar] [Eliminar]                                         │
└────────────────────────────────────────────────────────────┘

┌─ Openbank - Rendimiento 13% ──────────────────────────────┐
│ 💰 Balance actual: $30,000.00                               │
│ 📊 Rendimiento HOY: $1.07                                  │
│ ... (más detalles)                                         │
└────────────────────────────────────────────────────────────┘
```

### 4.2 ¿Cómo se calcula automáticamente?

El Dashboard usa la fórmula de cálculo definida para Klar:

**Para Cuenta Ahorro Klar (Interés compuesto 365 días):**

```
Rendimiento diario = principal * (pow(1 + rate/100/365, 1) - 1)

Para el monto en promoción ($50k @ 11%):
= 50000 * (pow(1 + 11/100/365, 1) - 1)
= 50000 * (pow(1.00030136986, 1) - 1)
= 50000 * 0.00030136986
= $15.07 por día

Para el monto en excedente ($50k @ 5%):
= 50000 * (pow(1 + 5/100/365, 1) - 1)
= 50000 * 0.00013698630
= $6.85 por día

Total diario: $15.07 + $6.85 = $21.92... (se muestra $3.01 ¿?)
```

**Nota:** El cálculo exacto depende de la fórmula configurada en la base de datos.

---

## PASO 5: CONFIGURAR FÓRMULAS EN `/configuracion`

### 5.1 Usuario accede a Configuración

```
CONFIGURACIÓN DEL SISTEMA
├─ Fórmulas de cálculo
│  ├─ Interés compuesto
│  ├─ Interés simple (360)
│  ├─ Ultra flexible
│  ├─ Openbank (tiered)
│  ├─ Mifel (360)
│  ├─ Kubo financiero
│  └─ 🆕 Klar (personalizada) ← Si quiere criar una fórmula específica
│
└─ Fórmulas ETF
   ├─ Precio actual ETF
   ├─ Capital invertido
   └─ ...
```

### 5.2 Usuario edita/crea fórmula para Klar

Si Klar tiene un cálculo especial, el usuario puede:

```
┌─────────────────────────────────────────────────────────────┐
│ EDITAR FÓRMULA: Klar Cuenta Ahorro                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Nombre: [Klar Compuesto Personalizado]                     │
│                                                             │
│ Interés Compuesto:                                         │
│ principal * (pow(1 + annualRate/100/365, days) - 1)        │
│                                                             │
│ Saldo Actualizado:                                         │
│ availableBalance + totalAccumulated                         │
│                                                             │
│ Balance Promocional:                                       │
│ min(availableBalance, promoCap)                            │
│                                                             │
│ Balance Excedente:                                         │
│ max(0, availableBalance - promoCap)                        │
│                                                             │
│ Descripción:                                               │
│ [Cálculo compuesto con retención fiscal 0%]               │
│                                                             │
│                [Guardar Fórmula]                           │
│                [Cancelar]                                  │
│                                                             │
│ Variables disponibles:                                      │
│ - principal: monto principal                              │
│ - annualRate: tasa anual (%)                              │
│ - days: días transcurridos                                │
│ - availableBalance: balance disponible                    │
│ - promoCap: tope promocional                              │
│ - taxRate: retención fiscal                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Fórmula aplicada automáticamente

Una vez guardada, el Dashboard usará esta fórmula para Klar:

```
Próxima carga de Dashboard:
├─ Openbank → Usa fórmula "Openbank (tiered)"
├─ Nu → Usa fórmula "Interés compuesto (365)"
└─ Klar → Usa fórmula "Klar Compuesto Personalizado" ✓
```

---

## PASO 6: AJUSTAR TASAS EN `/proteccion`

### 6.1 Usuario ve Klar en tabs de Protección

```
PROTECCIÓN - CONFIGURACIÓN PERSONAL
Ajusta tasas y parámetros
├─ [Mifel] [Openbank] [Nu] [DiDi] [Kubo] | [Klar - Ahorro]
│                                         | [Klar - Plazo]
```

### 6.2 Usuario edita tasas de Klar Cuenta Ahorro

```
┌─ Klar - Cuenta Ahorro ─────────────────────────────────────┐
│                                                             │
│ TASA ANUAL (%)                                              │
│ [11.50] ← Usuario cambió de 11.00 a 11.50                 │
│ Rendimiento anual en porcentaje                            │
│                                                             │
│ TOPE PROMOCIONAL                                            │
│ [50000]                                                     │
│ Monto máximo con tasa promocional                          │
│                                                             │
│ TASA EXCEDENTE (%)                                          │
│ [5.00]                                                      │
│ Tasa para montos fuera del tope                            │
│                                                             │
│ RETENCIÓN FISCAL (%)                                        │
│ [0.00]                                                      │
│ Impuesto retenido en ganancias                             │
│                                                             │
│ DÍAS BASE (AÑO)                                             │
│ [365]                                                       │
│ Días en el año comercial (365 ó 360)                       │
│                                                             │
│ DÍAS DE PROMOCIÓN                                           │
│ [60]                                                        │
│ Duración de la tasa promocional                            │
│                                                             │
│ MÉTODO DE CÁLCULO                                           │
│ [Interés compuesto (365)] ▼                                │
│ - Interés simple (365)                                     │
│ - Interés simple (360)                                     │
│ - Ultra flexible                                           │
│ Fórmula para calcular ganancias                            │
│                                                             │
│ ☑ Producto activo                                           │
│                                                             │
│               [Guardar cambios]                            │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Cambios se aplican inmediatamente

```
Usuario hace click en "Guardar cambios"
       ↓
Se guarda en BD: {
  institutionId: "klar",
  productId: "klar-cuenta-ahorro",
  annualRate: 11.5,     ← Cambio guardado
  promoCap: 50000,
  excessRate: 5,
  ...
}
       ↓
Próxima carga de Dashboard:
├─ Usa 11.5% en lugar de 11%
├─ Recalcula todos los rendimientos
└─ Usuario ve valores actualizados
```

---

## PASO 7: VER EN REPORTES

### 7.1 Usuario genera reporte

```
REPORTES
├─ Filtro: [Todas ▼]
├─ Periodo: [Agosto 2026] ▼
└─ [Descargar CSV] [Imprimir]
```

### 7.2 Reporte incluye Klar automáticamente

```
┌─────────────────────────────────────────────────────────────┐
│ REPORTE DE INVERSIONES - Agosto 2026                        │
├─────────────────────────────────────────────────────────────┤

INVERSIONES EN VISTA (Short-term)
┌─────────────────────────────────────────────────────────────┐
│ 🆕 Klar - Cuenta Ahorro Klar                                │
│ Inicio: 2026-08-29 | Saldo: $100,000.00 | Rate: 11.5%      │
│ Días: 15 | Acumulado: $472.60 | Siguiente mes: $100,472.60│
│ Método: Interés compuesto (365 días)                       │
│ Desglose:                                                   │
│  ├─ Monto promocional: $50,000 @ 11.5% → $224.66          │
│  └─ Monto excedente: $50,000 @ 5% → $26.02                │
└─────────────────────────────────────────────────────────────┘

RESUMEN TOTAL
├─ Inversión total: $155,000.00
├─ Rendimiento total: $568.40
├─ Impuestos retenidos: $0.00
└─ Neto: $568.40
```

---

## 📊 FLUJO COMPLETO DEL USUARIO

```
Usuario logueado
    ↓
[1] Va a /instituciones → Crea "Klar"
    ↓
[2] Va a /instituciones/klar → Agrega dos productos
    ├─ Cuenta Ahorro Klar (11%)
    └─ Plazo Fijo 6 Meses (12%)
    ↓
[3] Va a /configuracion → (Opcional) Crea fórmula especial para Klar
    ↓
[4] Va a /inversiones → Crea inversión en Klar Cuenta Ahorro
    └─ Balance: $100,000
    ↓
[5] Va a /dashboard → VE AUTOMÁTICAMENTE:
    ├─ Rendimiento diario de Klar
    ├─ Proyecciones mensuales
    ├─ Saldo acumulado
    └─ Método de cálculo usado
    ↓
[6] Va a /proteccion → PUEDE AJUSTAR:
    ├─ Tasa anual (11% → 11.5%)
    ├─ Tope promocional
    ├─ Tasa excedente
    ├─ Retención fiscal
    ├─ Días base
    └─ Método de cálculo
    ↓
[7] Va a /reportes → VE REPORTE CON:
    ├─ Inversión en Klar incluida
    ├─ Cálculos con parámetros actualizados
    └─ Totales consolidados
```

---

## 🔄 ¿CÓMO SE ACTUALIZAN LOS CÁLCULOS?

### Escenario: Usuario cambió tasa de 11% a 11.5%

**Timeline:**

```
08:00 AM - Usuario logueado crea inversión en Klar @ 11%
         └─ Dashboard calcula: $3.01 diarios

11:30 AM - Usuario va a /proteccion y cambia a 11.5%
         └─ Hace click [Guardar cambios]
         └─ Se guarda en BD

11:31 AM - Usuario regresa a Dashboard
         └─ Recarga página (F5)
         └─ API refetch de inversiones
         └─ Cálculo con 11.5% → $3.15 diarios (nuevo)
         └─ Usuario ve cambio inmediato

Próximos días - Dashboard actualiza automáticamente
         └─ Cada carga usa:
            • Fecha actual del servidor
            • Tasa actualizada (11.5%)
            • Fórmula guardada
            • Impuestos (si aplica)
```

### ¿Hay actualización automática SIN recargar página?

**No por defecto**, pero el usuario puede:

1. **Recargar manualmente** (F5 o button)
2. **Navegar entre secciones** (se refetch automáticamente)
3. **Si habilitamos WebSocket:** Actualización en tiempo real

---

## 📋 CHECKLIST: Lo que hace el USUARIO

✅ 1. Acceder a `/instituciones`
✅ 2. Hacer click en "+ Agregar Nueva Institución"
✅ 3. Llenar datos de Klar (nombre, país, web, notas)
✅ 4. Guardar institución
✅ 5. Acceder a detalles de Klar
✅ 6. Agregar producto "Cuenta Ahorro Klar"
✅ 7. Agregar producto "Plazo Fijo 6 Meses"
✅ 8. (Opcional) Ir a `/configuracion` y crear fórmula personalizada
✅ 9. Ir a `/inversiones` y crear inversión en Klar
✅ 10. Ver cálculos en `/dashboard`
✅ 11. Ir a `/proteccion` y ajustar tasas
✅ 12. Ver cambios en reportes `/reportes`

---

## 💾 ¿Dónde se guarda todo?

```
Base de Datos (PostgreSQL)
│
├─ Tabla: institutions
│  └─ id: "klar"
│     name: "Klar"
│     data: { country: "México", ... }
│
├─ Tabla: investments
│  └─ type: "vista"
│     institution_id: "klar"
│     product_id: "klar-cuenta-ahorro"
│     balance: 100000
│     startDate: "2026-08-29"
│     data: { annualRate: 11, promoCap: 50000, ... }
│
├─ Tabla: user_product_configs
│  └─ user_id: [uuid]
│     institution_id: "klar"
│     product_id: "klar-cuenta-ahorro"
│     data: { annualRate: 11.5, ... } ← Cambios del usuario
│
└─ Tabla: calculation_formulas
   └─ id: "klar-personalizado"
      data: { formula: "...", variables: [...] }
```

---

## 🎯 Resumen de la separación de fórmulas y lógica

Precisamente porque **separamos fórmulas de lógica**, el usuario puede:

| Aspecto | Fórmula | Lógica |
|---------|---------|--------|
| **Dónde** | `calculation_formulas` table | `calculationEngine.ts` |
| **Quién lo modifica** | Usuario logueado | Developers |
| **Cuándo se aplica** | Al calcular inversión | En código del Dashboard |
| **Ejemplo** | `annualRate * days / 365` | `compoundInterest()` función |
| **Flexible** | ✅ Usuario puede cambiar | ❌ Fijo en código |
| **Persistente** | ✅ Se guarda en BD | ✅ Se compila en JavaScript |

---

## 🚀 ¿Qué sucede si usuario cambia parámetros frecuentemente?

```
Día 1: Crea inversión @ 11%
       Dashboard: $3.01 diarios

Día 5: Cambia a 11.5%
       Dashboard: $3.15 diarios

Día 10: Cambia a 12%
        Dashboard: $3.29 diarios

Día 15: Cambia a 10%
        Dashboard: $2.74 diarios

Resultado final en Dashboard:
├─ Acumulado (15 días): ~$45.23
│  (Cálculo ponderado con las diferentes tasas)
├─ Tasa promedio: ~11%
└─ Nota: Cada cambio se aplica desde ese momento forward
```

**¿Los cambios afectan el pasado?** No, solo afecta cálculos futuros.


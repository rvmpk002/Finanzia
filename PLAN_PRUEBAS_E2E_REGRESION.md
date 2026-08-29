# Plan de Pruebas E2E - Finanzia
## Regresión Completa del Flujo de Usuario

**Fecha:** 2026-08-29  
**Objetivo:** Validar que el flujo completo de agregar una institución, crear inversiones, editar tasas y calcular rendimientos funciona correctamente.

---

## 📋 RESUMEN DE PRUEBAS

- **Duración estimada:** 45-60 minutos
- **Navegadores:** Chrome, Firefox (opcional)
- **Requisitos:** Usuario logueado, base de datos activa, servidor backend corriendo

---

## ✅ FASE 1: AGREGAR INSTITUCIÓN NUEVA

### 1.1 Acceder a `/instituciones`

**Pasos:**
1. Ir a http://localhost:5173/instituciones (o tu URL)
2. Verificar que se carga la página

**Esperado:**
- ✅ Página carga sin errores
- ✅ Se ve lista de instituciones (Banco Plata, Openbank, Nu, DiDi, Kubo)
- ✅ Botón "+ Agregar Nueva Institución" visible

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 1.2 Crear institución "Klark test"

**Pasos:**
1. Click en "+ Agregar Nueva Institución"
2. Llenar formulario:
   - Nombre: "Klark test"
   - País: "México"
   - Categoría: "Banca digital"
   - Sitio web: "https://klark.test.com"
   - Notas: "Institución de prueba para validación E2E"
3. Click "Guardar Institución"

**Esperado:**
- ✅ Formulario se abre sin errores
- ✅ Se puede llenar todos los campos
- ✅ Mensaje de éxito: "Institución guardada"
- ✅ Klark test aparece en lista ordenada alfabéticamente
- ✅ Se puede hacer click en Klark test para ver detalles

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

**Dato capturado (para próximos pasos):**
- Institution ID: _________________________________

---

## ✅ FASE 2: AGREGAR PRODUCTOS A LA INSTITUCIÓN

### 2.1 Agregar primer producto

**Pasos:**
1. En detalles de Klark test, click "+ Agregar Producto"
2. Llenar formulario:
   - ID: "klark-cuenta-ahorro"
   - Nombre: "Cuenta Ahorro Klark"
   - Descripción: "11% de rendimiento anual"
   - Tasa anual: 11
   - Tope promocional: 50000
   - Tasa excedente: 5
   - Condiciones: "11% en primeros $50k, 5% excedente"
   - Icono: "account"
3. Click "Guardar Producto"

**Esperado:**
- ✅ Producto aparece en lista
- ✅ Se ve nombre "Cuenta Ahorro Klark" (no UUID)
- ✅ Datos se guardaron correctamente

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 2.2 Agregar segundo producto

**Pasos:**
1. Click "+ Agregar Producto"
2. Llenar formulario:
   - ID: "klark-plazo-6m"
   - Nombre: "Plazo Fijo 6 Meses"
   - Descripción: "12% anual a plazo fijo"
   - Tasa anual: 12
   - Tope: 0
   - Condiciones: "180 días"
   - Icono: "fixed"
3. Click "Guardar Producto"

**Esperado:**
- ✅ Segundo producto aparece
- ✅ Se ven ambos productos en lista

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 3: CREAR INVERSIONES CON LA INSTITUCIÓN

### 3.1 Ir a Nueva Inversión

**Pasos:**
1. Ir a http://localhost:5173/inversiones
2. En sidebar, verificar que aparezca "Klark test"

**Esperado:**
- ✅ Klark test aparece en lista de instituciones
- ✅ Se puede expandir/seleccionar

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 3.2 Crear inversión "Cuenta Ahorro Klark"

**Pasos:**
1. Seleccionar "Klark test" en el sidebar
2. Verificar productos disponibles:
   - "Cuenta Ahorro Klark"
   - "Plazo Fijo 6 Meses"
3. Click en "Cuenta Ahorro Klark"
4. Llenar formulario:
   - Nombre: "Mi Ahorro Klark"
   - Saldo inicial: 100000
   - Fecha inicio: 2026-08-29
   - Tipo: "Vista"
5. Verificar cálculo aproximado:
   - Monto en promoción: $50,000 @ 11%
   - Monto en excedente: $50,000 @ 5%
6. Click "+ Agregar Inversión"

**Esperado:**
- ✅ Se muestra cálculo aproximado correcto:
   - En promoción: $50k @ 11%
   - En excedente: $50k @ 5%
- ✅ Mensaje: "✓ Inversión creada exitosamente"
- ✅ Inversión aparece en lista

**Resultado:** _____ PASS / FAIL

**Cálculo mostrado:**
- Monto promoción: _________________ (Esperado: $50,000)
- Monto excedente: _________________ (Esperado: $50,000)
- Rendimiento diario estimado: _________________ (Esperado: ~$2.50)

**Detalles/Error:** ___________________________________________

---

### 3.3 Crear inversión "Plazo Fijo" (opcional)

**Pasos:**
1. Crear segunda inversión en "Plazo Fijo 6 Meses"
2. Datos:
   - Nombre: "Mi Plazo Klark"
   - Saldo: 50000
   - Fecha inicio: 2026-08-29
   - Tipo: "Plazo"
   - Plazo: 180 días

**Esperado:**
- ✅ Inversión se crea exitosamente
- ✅ Se muestra con icono de plazo fijo

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 4: VERIFICAR CÁLCULOS EN DASHBOARD

### 4.1 Ir a Dashboard

**Pasos:**
1. Ir a http://localhost:5173/dashboard
2. Verificar que carga sin errores

**Esperado:**
- ✅ Dashboard carga
- ✅ Se ven resúmenes consolidados
- ✅ Klark aparece en lista de inversiones

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 4.2 Validar Cálculos de Cuenta Ahorro Klark

**Pasos:**
1. Buscar sección "Klark - Cuenta Ahorro Klark"
2. Verificar todos los valores calculados

**Esperado (Día 0 - 2026-08-29):**
- ✅ Balance actual: $100,000.00
- ✅ Rendimiento HOY: ~$3.01 (100k * 11% / 365 + 50k * 5% / 365)
  - Cálculo: 50000 * 0.11 / 365 + 50000 * 0.05 / 365 = 15.07 + 6.85 = $21.92... 
  - **NOTA:** Revisar si el cálculo que se muestra coincide
- ✅ Rendimiento mensual (est.): ~$90.41
- ✅ Próximo mes: ~$100,090.41
- ✅ Acumulado: $0 (día 0)
- ✅ Tasa efectiva: 11.00% (promo) / 5.00% (exceso)
- ✅ Método: Interés compuesto (365 días)

**Resultado:** _____ PASS / FAIL

**Valores capturados:**
- Rendimiento HOY: _________________ (Esperado: ~$3.01)
- Rendimiento MES: _________________ (Esperado: ~$90.41)
- Próximo mes: _________________ (Esperado: ~$100,090.41)
- Acumulado: _________________ (Esperado: $0)

**Detalles/Error:** ___________________________________________

---

### 4.3 Validar que instituciones antiguas aún funcionan

**Pasos:**
1. Buscar inversiones de "Openbank" (si las hay)
2. Verificar que calculan correctamente
3. Buscar inversiones de "Nu"
4. Verificar que calculan correctamente

**Esperado:**
- ✅ Todas las instituciones antiguas funcionan
- ✅ No hay impacto en sus cálculos

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 5: EDITAR TASAS EN PROTECCIÓN

### 5.1 Ir a Protección

**Pasos:**
1. Ir a http://localhost:5173/proteccion
2. Verificar tabs disponibles

**Esperado:**
- ✅ Página carga
- ✅ Tabs de instituciones aparecen:
  - Mifel
  - Openbank
  - Nu
  - DiDi
  - Kubo
  - **Klark test** ← Debe aparecer
- ✅ Bajo Klark test aparecen productos:
  - Cuenta Ahorro Klark
  - Plazo Fijo 6 Meses

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 5.2 Seleccionar Klark - Cuenta Ahorro

**Pasos:**
1. Click en tab "Klark - Cuenta Ahorro Klark"
2. Verificar que se carga formulario

**Esperado:**
- ✅ Tab se selecciona (color distinto)
- ✅ Formulario carga con valores:
  - Tasa anual (%): 11
  - Tope promocional: 50000
  - Tasa excedente (%): 5
  - Retención fiscal (%): 0
  - Días base: 365
  - Días de promoción: 60
  - Método de cálculo: Interés compuesto (365)
  - Producto activo: ☑

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 5.3 Cambiar tasa anual de 11% a 11.5%

**Pasos:**
1. En campo "Tasa anual (%)", cambiar valor:
   - De: 11
   - A: 11.5
2. Click "[Guardar cambios]"

**Esperado:**
- ✅ Cambio se acepta
- ✅ Mensaje: "Configuración del usuario guardada."
- ✅ No hay errores en consola

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 5.4 Editar Tope Promocional de $50k a $60k

**Pasos:**
1. En campo "Tope promocional", cambiar:
   - De: 50000
   - A: 60000
2. Click "[Guardar cambios]"

**Esperado:**
- ✅ Se guarda correctamente
- ✅ Mensaje de éxito
- ✅ Valor persiste al recargar página

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 5.5 Cambiar Método de Cálculo (si es posible)

**Pasos:**
1. Click en dropdown "Método de cálculo"
2. Verificar opciones disponibles

**Esperado:**
- ✅ Dropdown abre
- ✅ Se ven opciones genéricas:
  - Interés compuesto (365)
  - Interés simple (365)
  - Interés simple (360)
  - Ultra flexible
- ✅ NO aparecen métodos de otras instituciones (mifel360, openbank, kubo)

**Resultado:** _____ PASS / FAIL

**Opciones vistas:**
- ________________________
- ________________________
- ________________________
- ________________________

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 6: VALIDAR CAMBIOS EN DASHBOARD

### 6.1 Recargar Dashboard

**Pasos:**
1. Ir a Dashboard (F5 o recargar)
2. Buscar "Klark - Cuenta Ahorro Klark"

**Esperado:**
- ✅ Rendimiento HOY ha aumentado (porque tasa es 11.5% ahora)
- ✅ Rendimiento mensual aumentó
- ✅ Cambio se refleja inmediatamente
- ✅ Tope ahora muestra $60,000 (no $50,000)

**Resultado:** _____ PASS / FAIL

**Valores después del cambio:**
- Tasa anual mostrada: _________________ (Esperado: 11.5%)
- Tope: _________________ (Esperado: 60,000)
- Rendimiento HOY: _________________ (Esperado: mayor que antes)

**Detalles/Error:** ___________________________________________

---

### 6.2 Validar Desglose de Monto en Promoción vs Excedente

**Pasos:**
1. En Dashboard, expandir sección de Klark
2. Buscar desglose:
   - En promoción: X @ 11.5%
   - En excedente: Y @ 5%

**Esperado:**
- ✅ Se muestra correctamente que:
  - $60,000 @ 11.5% (nuevo tope)
  - $40,000 @ 5% (excedente)
- ✅ Suma = $100,000 (balance total)
- ✅ Rendimiento diario se calcula como:
  - ($60k * 11.5% / 365) + ($40k * 5% / 365)

**Resultado:** _____ PASS / FAIL

**Desglose mostrado:**
- Monto en promoción: _________________ @ _____% (Esperado: $60,000 @ 11.5%)
- Monto excedente: _________________ @ _____% (Esperado: $40,000 @ 5%)

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 7: RETIRAR DINERO Y VERIFICAR RECÁLCULO

### 7.1 Editar inversión para retirar dinero

**Pasos:**
1. Ir a /inversiones
2. Buscar "Mi Ahorro Klark"
3. Click en "[Editar]"
4. En campo "Dinero retirado":
   - De: 0
   - A: 10000
5. Click "Guardar cambios"

**Esperado:**
- ✅ Se acepta el retiro
- ✅ Mensaje de éxito
- ✅ Balance actualizado

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 7.2 Validar Recálculo en Dashboard

**Pasos:**
1. Recargar Dashboard
2. Buscar Klark - Cuenta Ahorro
3. Verificar nuevo saldo disponible

**Esperado:**
- ✅ Balance disponible: $90,000 (100k - 10k retirado)
- ✅ Desglose actualizado:
  - $60,000 @ 11.5% (todavía en tope)
  - $30,000 @ 5% (nuevo excedente)
- ✅ Rendimiento HOY ha disminuido (porque hay menos dinero)
- ✅ Cálculo correcto:
  - ($60k * 11.5% / 365) + ($30k * 5% / 365)

**Resultado:** _____ PASS / FAIL

**Valores después del retiro:**
- Saldo disponible: _________________ (Esperado: $90,000)
- En promoción: _________________ (Esperado: $60,000)
- En excedente: _________________ (Esperado: $30,000)
- Rendimiento HOY: _________________ (Esperado: menor que antes)

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 8: VERIFICAR CÁLCULOS DIARIOS

### 8.1 Simular paso de tiempo

**Pasos:**
1. Hacer nota del "Acumulado" hoy
2. (En QA real) Esperar 1 día o cambiar fecha del sistema
3. Recargar Dashboard
4. Verificar "Acumulado"

**Esperado (después de 1 día):**
- ✅ Acumulado ha aumentado aproximadamente:
  - = Rendimiento HOY × 1 día
  - ≈ ($60k * 11.5% / 365) + ($30k * 5% / 365)
  - ≈ $18.90 + $4.11 = $23.01 aprox

**Para esta prueba:** 
- Documentar que la fórmula se aplicaría correctamente
- Si cambias fecha del servidor, debe recalcular

**Resultado:** _____ PASS / FAIL

**Nota:** En testing real, esperar 24 horas o simular con cambio de fecha

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 9: REPORTES

### 9.1 Ir a Reportes

**Pasos:**
1. Ir a http://localhost:5173/reportes
2. Verificar filtros

**Esperado:**
- ✅ Página carga
- ✅ Se ven filtros:
  - Filtro de tipo (Vista, Plazo, ETF, Todas)
  - Periodo

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 9.2 Ver inversión Klark en reporte

**Pasos:**
1. Filtro: "Todas"
2. Período: Agosto 2026
3. Buscar "Klark - Cuenta Ahorro Klark"

**Esperado:**
- ✅ Inversión aparece en reporte
- ✅ Muestra:
  - Inicio: 2026-08-29
  - Saldo: $100,000
  - Saldo disponible: $90,000 (después del retiro)
  - Acumulado: ~$23.01 (aprox)
  - Tasa: 11.5% (promo) / 5% (exceso)
  - Método: Interés compuesto
- ✅ Se puede descargar CSV

**Resultado:** _____ PASS / FAIL

**Datos en reporte:**
- Inicio: _________________ (Esperado: 2026-08-29)
- Saldo inicial: _________________ (Esperado: $100,000)
- Retirado: _________________ (Esperado: $10,000)
- Acumulado: _________________ (Esperado: ~$23-25)

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 10: CONFIGURACIÓN DE FÓRMULAS (Opcional)

### 10.1 Ir a Configuración

**Pasos:**
1. Ir a http://localhost:5173/configuracion
2. Verificar si hay sección de fórmulas

**Esperado:**
- ✅ Página carga
- ✅ Se ven fórmulas disponibles
- ✅ Puede editar fórmula "Interés compuesto" (usado por Klark)

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

## ✅ FASE 11: DATOS PERSISTENTES

### 11.1 Cambiar pestaña y regresar

**Pasos:**
1. Desde Dashboard, ir a Inversiones
2. Ir a Protección
3. Ir a Reportes
4. Regresar a Dashboard

**Esperado:**
- ✅ Todos los datos se mantienen
- ✅ No hay pérdida de información
- ✅ Cálculos son consistentes

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 11.2 Recargar página completa

**Pasos:**
1. En Dashboard, presionar F5
2. Esperar que cargue

**Esperado:**
- ✅ Página recarga sin errores
- ✅ Todos los datos se cargan desde la API
- ✅ Klark y sus inversiones están presentes
- ✅ Valores coinciden con los anteriores

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

### 11.3 Cerrar sesión y volver a iniciar

**Pasos:**
1. Ir a Perfil
2. Cerrar sesión (logout)
3. Iniciar sesión nuevamente
4. Ir a Dashboard

**Esperado:**
- ✅ Sesión se cierra correctamente
- ✅ Se puede iniciar sesión de nuevo
- ✅ Klark y todas las inversiones están presentes
- ✅ Todos los cambios (tasa 11.5%, tope $60k, etc.) se mantienen

**Resultado:** _____ PASS / FAIL

**Detalles/Error:** ___________________________________________

---

## 🔍 VERIFICACIONES DE ERRORES EN CONSOLA

### 11.4 Consola del navegador (F12)

**Pasos:**
1. Abrir DevTools (F12)
2. Ir a pestaña "Console"
3. Durante todo el flujo E2E, verificar que NO haya:
   - Errores en rojo (errors)
   - Errores críticos (uncaught)

**Esperado:**
- ✅ Consola limpia
- ✅ Solo warnings (si acaso)
- ✅ No hay errores no capturados

**Errores encontrados:**
- ________________________
- ________________________
- ________________________

**Resultado:** _____ PASS / FAIL

**Detalles:** ___________________________________________

---

### 11.5 Network tab (Peticiones HTTP)

**Pasos:**
1. En DevTools, pestaña "Network"
2. Revisar que todas las peticiones sean exitosas

**Esperado:**
- ✅ GET /api/institutions → 200 OK
- ✅ GET /api/user-config → 200 OK
- ✅ PUT /api/user-config → 200 OK
- ✅ GET /api/investments → 200 OK
- ✅ POST /api/investments → 201 Created
- ✅ No hay 400, 401, 403, 404, 500

**Peticiones verificadas:**
- GET /api/institutions: _____ OK / FAIL
- GET /api/user-config: _____ OK / FAIL
- PUT /api/user-config: _____ OK / FAIL
- GET /api/investments: _____ OK / FAIL
- POST /api/investments: _____ OK / FAIL
- Otros errores: ________________________

**Resultado:** _____ PASS / FAIL

---

## 📊 RESUMEN GENERAL DE PRUEBAS

| Fase | Descripción | Resultado |
|------|-------------|-----------|
| 1 | Agregar institución | PASS / FAIL |
| 2 | Agregar productos | PASS / FAIL |
| 3 | Crear inversiones | PASS / FAIL |
| 4 | Cálculos Dashboard | PASS / FAIL |
| 5 | Editar tasas Protección | PASS / FAIL |
| 6 | Cambios reflejados | PASS / FAIL |
| 7 | Retiro dinero | PASS / FAIL |
| 8 | Cálculos diarios | PASS / FAIL |
| 9 | Reportes | PASS / FAIL |
| 10 | Configuración | PASS / FAIL |
| 11 | Datos persistentes | PASS / FAIL |

**Total de pruebas:** 11 fases
**Pasadas:** _____ 
**Fallidas:** _____

---

## 🐛 REPORTE DE ERRORES ENCONTRADOS

### Error #1
**Severidad:** 🔴 CRÍTICO / 🟡 ALTO / 🟢 MEDIO / 🔵 BAJO

**Descripción:**
_________________________________________________________________

**Pasos para reproducir:**
_________________________________________________________________

**Resultado esperado:**
_________________________________________________________________

**Resultado actual:**
_________________________________________________________________

**Archivo/Función afectada:**
_________________________________________________________________

---

### Error #2
**Severidad:** 🔴 CRÍTICO / 🟡 ALTO / 🟢 MEDIO / 🔵 BAJO

**Descripción:**
_________________________________________________________________

**Pasos para reproducir:**
_________________________________________________________________

**Resultado esperado:**
_________________________________________________________________

**Resultado actual:**
_________________________________________________________________

**Archivo/Función afectada:**
_________________________________________________________________

---

### Error #3
**Severidad:** 🔴 CRÍTICO / 🟡 ALTO / 🟢 MEDIO / 🔵 BAJO

**Descripción:**
_________________________________________________________________

**Pasos para reproducir:**
_________________________________________________________________

**Resultado esperado:**
_________________________________________________________________

**Resultado actual:**
_________________________________________________________________

**Archivo/Función afectada:**
_________________________________________________________________

---

## ✅ CHECKLIST FINAL

- [ ] Todos los pasos ejecutados
- [ ] Datos capturados documentados
- [ ] Errores de consola verificados
- [ ] Peticiones HTTP validadas
- [ ] Reportes de errores completados
- [ ] Testing en múltiples navegadores (si aplica)
- [ ] Datos persisten correctamente
- [ ] Cálculos son matemáticamente correctos

---

## 📝 NOTAS Y OBSERVACIONES

__________________________________________________________________

__________________________________________________________________

__________________________________________________________________

__________________________________________________________________

---

## 🎯 CONCLUSIÓN

**Estado General:** ✅ APTO PARA PRODUCCIÓN / ⚠️ REQUIERE FIXES / ❌ NO APTO

**Resumen:**
__________________________________________________________________

__________________________________________________________________


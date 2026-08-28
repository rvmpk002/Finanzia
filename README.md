# Finanzia

Directorio de instituciones financieras y sus productos de ahorro. Incluye Banco Plata, Openbank, Nu, DiDi Cuenta, Mifel, Kubo Financiero, Mercado Pago y CETESdirecto, con sus datos basados en las fuentes proporcionadas.

## Desarrollo

```bash
npm install
copy .env.example .env
npm run dev:all
```

La landing es `/login`. Desde allí se puede crear cuenta, iniciar sesión y
solicitar recuperación de contraseña. Las cuentas, sesiones y configuración 2FA
se guardan en Neon PostgreSQL. La base de conocimiento está disponible en
`/instituciones` después de iniciar sesión.

## Despliegue gratuito

El proyecto usa Netlify para el frontend y la API mediante Netlify Functions,
Neon para PostgreSQL y Resend para correo transaccional. En Netlify configura:

```text
DATABASE_URL=postgresql://usuario:contraseña@tu-proyecto.neon.tech/neondb?sslmode=require
DATABASE_SSL=true
RESEND_API_KEY=re_...
RESEND_FROM=Finanzia <correo-verificado@tu-dominio.com>
WEBAUTHN_RP_ID=cosmic-smakager-b538c4.netlify.app
WEBAUTHN_ORIGIN=https://cosmic-smakager-b538c4.netlify.app
AUTH_DEBUG=false
```

Conecta el repositorio a Netlify y usa `netlify.toml`; el comando de build es
`npm run build`. La Function crea las tablas necesarias al iniciar.

## Despliegue en Render

El repositorio incluye `render.yaml` para desplegar el frontend y la API como
un único Web Service. Render ejecuta `npm ci && npm run build` y después
`node server/index.js`; Express sirve `dist` y conserva las rutas `/api/*`.

En Render configura las mismas variables de entorno usadas por Netlify y
añade:

```text
WEBAUTHN_RP_ID=tu-servicio.onrender.com
WEBAUTHN_ORIGIN=https://tu-servicio.onrender.com
```

Render proporciona automáticamente `PORT`. Para un dominio personalizado,
actualiza también esos dos valores de WebAuthn con el dominio definitivo.

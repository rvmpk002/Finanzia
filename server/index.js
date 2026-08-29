import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import pg from 'pg'
import crypto from 'node:crypto'
import { resolve4 } from 'node:dns/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'
import { generateSecret, generateURI, verify } from 'otplib'
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001)
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(currentDirectory, '../dist')
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined }) : null
const rpName = 'Finanzia'
const rpID = process.env.WEBAUTHN_RP_ID ?? 'cosmic-smakager-b538c4.netlify.app'
const origin = process.env.WEBAUTHN_ORIGIN ?? `https://${rpID}`
const smtpHost = process.env.SMTP_HOST ?? 'smtp.gmail.com'
const smtpConnectionHost = process.env.SMTP_USER && process.env.SMTP_PASS
  ? process.env.SMTP_HOST_IP ?? (await resolve4(smtpHost).then((addresses) => addresses[0]).catch(() => smtpHost))
  : smtpHost
const smtpTransporter = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({ host: smtpConnectionHost, port: Number(process.env.SMTP_PORT ?? 587), secure: Number(process.env.SMTP_PORT ?? 587) === 465, requireTLS: true, tls: { servername: smtpHost }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  : null

app.use(cors())
app.use(express.json())

async function ensureSchema() {
  if (!pool) return
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')
  await pool.query(`CREATE TABLE IF NOT EXISTS institutions (id TEXT PRIMARY KEY, name TEXT NOT NULL, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  await pool.query(`CREATE TABLE IF NOT EXISTS investments (id BIGSERIAL PRIMARY KEY, type VARCHAR(20) NOT NULL CHECK (type IN ('vista', 'plazo', 'etf')), institution_id TEXT NOT NULL, product_id TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, password_hash TEXT, full_name TEXT, phone TEXT, two_factor_secret TEXT, two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  await pool.query(`CREATE TABLE IF NOT EXISTS calculation_formulas (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
  )`)
  await pool.query(`CREATE TABLE IF NOT EXISTS user_product_configs (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, institution_id, product_id)
  )`)
  await pool.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`)
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS password_resets (token TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS passkeys (id TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, public_key BYTEA NOT NULL, counter BIGINT NOT NULL DEFAULT 0, transports JSONB)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS webauthn_challenges (id TEXT PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, challenge TEXT NOT NULL, kind TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`)
}

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(`${salt}:${derived.toString('hex')}`)))
const verifyPassword = (password, stored) => { if (!stored) return false; const [salt, key] = stored.split(':'); return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hashPasswordSync(password, salt), 'hex')) }
const hashPasswordSync = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex')
const createSession = async (userId) => { const token = crypto.randomBytes(32).toString('hex'); await pool.query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [token, userId]); return token }
const currentUser = async (request) => { const token = request.headers.authorization?.replace('Bearer ', ''); if (!token) return null; const result = await pool.query('SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = $1 AND sessions.expires_at > NOW()', [token]); return result.rows[0] ?? null }
const sendResetEmail = async (to, resetUrl) => {
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({ from: process.env.EMAIL_FROM ?? process.env.SMTP_USER, to, subject: 'Restablece tu contraseña de Finanzia', text: `Restablece tu contraseña: ${resetUrl}` })
      return true
    } catch (error) {
      console.error('SMTP rechazó el correo de recuperación:', error)
      return false
    }
  }
  if (!process.env.RESEND_API_KEY) return false
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Finanzia <onboarding@resend.dev>',
        to: [to],
        subject: 'Restablece tu contraseña de Finanzia',
        text: `Restablece tu contraseña: ${resetUrl}`,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      const details = await response.text()
      console.error(`Resend rechazó el correo (${response.status}):`, details)
    }
    return response.ok
  } catch (error) {
    console.error('No fue posible contactar a Resend:', error)
    return false
  }
}

app.get('/api/health', (_request, response) => response.json({ database: Boolean(pool) }))

app.post('/api/auth/register', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const password = String(request.body?.password ?? '')
  if (!email || password.length < 8) return response.status(400).json({ error: 'Correo y contraseña válida son obligatorios.' })
  try {
    const passwordHash = await hashPassword(password)
    const result = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, two_factor_enabled', [email, passwordHash])
    return response.status(201).json({ user: result.rows[0], token: await createSession(result.rows[0].id) })
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'El correo ya está registrado.' })
    console.error(error); return response.status(500).json({ error: 'No fue posible crear la cuenta.' })
  }
})

app.post('/api/auth/login', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const password = String(request.body?.password ?? '')
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  const user = result.rows[0]
  if (!user || !verifyPassword(password, user.password_hash)) return response.status(401).json({ error: 'Correo o contraseña incorrectos.' })
  if (user.two_factor_enabled) {
    if (!request.body?.twoFactorCode || !(await verify({ token: String(request.body.twoFactorCode), secret: user.two_factor_secret })).valid) return response.status(401).json({ error: 'Se requiere un código 2FA.', requiresTwoFactor: true })
  }
  return response.json({ user: { id: user.id, email: user.email, two_factor_enabled: user.two_factor_enabled }, token: await createSession(user.id) })
})

app.post('/api/auth/forgot-password', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (userResult.rows[0]) {
    const token = crypto.randomBytes(32).toString('hex')
    await pool.query('INSERT INTO password_resets (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 minutes\')', [token, userResult.rows[0].id])
    const resetUrl = `${origin}/login?reset=${token}`
    if (await sendResetEmail(email, resetUrl)) return response.json({ message: 'Si el correo existe, recibirás instrucciones.' })
    else if (process.env.AUTH_DEBUG === 'true') return response.json({ message: 'Solicitud creada.', resetUrl })
  }
  return response.json({ message: 'Si el correo existe, recibirás instrucciones.' })
})

app.post('/api/auth/reset-password', async (request, response) => {
  const token = String(request.body?.token ?? '')
  const password = String(request.body?.password ?? '')
  if (password.length < 8) return response.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' })
  const result = await pool.query('SELECT user_id FROM password_resets WHERE token = $1 AND expires_at > NOW()', [token])
  if (!result.rows[0]) return response.status(400).json({ error: 'El enlace no es válido o expiró.' })
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(password), result.rows[0].user_id])
  await pool.query('DELETE FROM password_resets WHERE token = $1', [token])
  return response.json({ message: 'Contraseña actualizada.' })
})

app.get('/api/auth/me', async (request, response) => {
  const user = await currentUser(request)
  return user ? response.json({ id: user.id, email: user.email, full_name: user.full_name, phone: user.phone, two_factor_enabled: user.two_factor_enabled }) : response.status(401).json({ error: 'Sesión no válida.' })
})

app.put('/api/auth/profile', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const fullName = String(request.body?.full_name ?? '').trim().slice(0, 120)
  const phone = String(request.body?.phone ?? '').trim().slice(0, 40)
  const result = await pool.query('UPDATE users SET full_name = $1, phone = $2 WHERE id = $3 RETURNING id, email, full_name, phone, two_factor_enabled', [fullName || null, phone || null, user.id])
  return response.json(result.rows[0])
})

app.post('/api/auth/2fa/setup', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const secret = generateSecret(); await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, user.id])
  return response.json({ secret, otpauthUrl: generateURI({ secret, issuer: rpName, label: user.email }) })
})

app.post('/api/auth/2fa/enable', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const valid = user.two_factor_secret && (await verify({ token: String(request.body?.code ?? ''), secret: user.two_factor_secret })).valid
  if (!valid) return response.status(400).json({ error: 'Código 2FA incorrecto.' })
  await pool.query('UPDATE users SET two_factor_enabled = TRUE WHERE id = $1', [user.id]); return response.json({ enabled: true })
})

app.post('/api/auth/2fa/disable', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  await pool.query('UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1', [user.id])
  return response.json({ enabled: false })
})

app.post('/api/auth/passkey/options', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' })
  await pool.query('INSERT INTO webauthn_challenges (id, challenge, kind, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'5 minutes\')', [crypto.randomUUID(), options.challenge, 'authentication'])
  return response.json(options)
})

app.post('/api/auth/passkey/verify', async (request, response) => {
  const clientDataJSON = request.body?.response?.clientDataJSON
  let clientData
  try {
    clientData = JSON.parse(Buffer.from(String(clientDataJSON), 'base64url').toString('utf8'))
  } catch {
    return response.status(400).json({ error: 'La respuesta Passkey no es válida.' })
  }
  const challengeResult = await pool.query('SELECT id, challenge FROM webauthn_challenges WHERE challenge = $1 AND kind = $2 AND expires_at > NOW() LIMIT 1', [clientData.challenge, 'authentication'])
  const challenge = challengeResult.rows[0]
  if (!challenge) return response.status(400).json({ error: 'El desafío Passkey expiró.' })
  const credentialIds = [...new Set([request.body?.id, request.body?.rawId].filter(Boolean))]
  const credential = await pool.query('SELECT passkeys.*, users.email FROM passkeys JOIN users ON users.id = passkeys.user_id WHERE passkeys.id = ANY($1::text[])', [credentialIds])
  if (!credential.rows[0]) return response.status(401).json({ error: 'Esta Passkey no está registrada en Finanzia. Inicia sesión con contraseña y regístrala desde Perfil.' })
  let verification
  try {
    verification = await verifyAuthenticationResponse({ response: request.body, expectedChallenge: challenge.challenge, expectedOrigin: origin, expectedRPID: rpID, credential: { id: credential.rows[0].id, publicKey: credential.rows[0].public_key, counter: Number(credential.rows[0].counter) } })
  } catch (error) {
    console.error('Falló la verificación Passkey.', error)
    return response.status(401).json({ error: 'La Passkey no coincide con este dominio o desafío.' })
  }
  if (!verification.verified) return response.status(401).json({ error: 'No fue posible verificar la Passkey.' })
  await pool.query('UPDATE passkeys SET counter = $1 WHERE id = $2', [verification.authenticationInfo.newCounter, credential.rows[0].id])
  await pool.query('DELETE FROM webauthn_challenges WHERE id = $1', [challenge.id])
  return response.json({ user: { id: credential.rows[0].user_id, email: credential.rows[0].email }, token: await createSession(credential.rows[0].user_id) })
})

app.post('/api/auth/passkey/register/options', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const options = await generateRegistrationOptions({ rpName, rpID, userName: user.email, userID: new TextEncoder().encode(user.id), attestationType: 'none', excludeCredentials: (await pool.query('SELECT id, transports FROM passkeys WHERE user_id = $1', [user.id])).rows.map((credential) => ({ id: credential.id, transports: credential.transports ?? undefined })) })
  await pool.query('INSERT INTO webauthn_challenges (id, user_id, challenge, kind, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'5 minutes\')', [crypto.randomUUID(), user.id, options.challenge, 'registration'])
  return response.json(options)
})

app.post('/api/auth/passkey/register/verify', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const challenge = (await pool.query('SELECT * FROM webauthn_challenges WHERE user_id = $1 AND kind = $2 AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1', [user.id, 'registration'])).rows[0]
  if (!challenge) return response.status(400).json({ error: 'El desafío Passkey expiró.' })
  const verification = await verifyRegistrationResponse({ response: request.body, expectedChallenge: challenge.challenge, expectedOrigin: origin, expectedRPID: rpID })
  if (!verification.verified || !verification.registrationInfo) return response.status(400).json({ error: 'No fue posible registrar la Passkey.' })
  const { credential } = verification.registrationInfo
  await pool.query('INSERT INTO passkeys (id, user_id, public_key, counter, transports) VALUES ($1, $2, $3, $4, $5)', [credential.id, user.id, Buffer.from(credential.publicKey), credential.counter, JSON.stringify(request.body.response?.transports ?? [])])
  await pool.query('DELETE FROM webauthn_challenges WHERE id = $1', [challenge.id])
  return response.json({ registered: true })
})

app.get('/api/auth/passkeys', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const result = await pool.query('SELECT id, transports FROM passkeys WHERE user_id = $1 ORDER BY id', [user.id])
  return response.json(result.rows.map((passkey) => ({ id: passkey.id, transports: passkey.transports ?? [] })))
})

app.delete('/api/auth/passkey/:id', async (request, response) => {
  const user = await currentUser(request); if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const result = await pool.query('DELETE FROM passkeys WHERE id = $1 AND user_id = $2 RETURNING id', [request.params.id, user.id])
  if (!result.rows[0]) return response.status(404).json({ error: 'La Passkey no existe o no pertenece a tu cuenta.' })
  return response.json({ revoked: true, id: result.rows[0].id })
})

app.get('/api/formulas', async (request, response) => {
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  try {
    const result = await pool.query('SELECT data FROM calculation_formulas WHERE id = $1 AND user_id = $2', ['default', user.id])
    return response.json(result.rows[0]?.data ?? {})
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible consultar las fórmulas.' })
  }
})

app.put('/api/formulas', async (request, response) => {
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  try {
    const result = await pool.query('INSERT INTO calculation_formulas (id, user_id, data, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (id, user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW() RETURNING data', ['default', user.id, request.body ?? {}])
    return response.json(result.rows[0].data)
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible guardar las fórmulas.' })
  }
})

app.get('/api/user-config', async (request, response) => {
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  try {
    const result = await pool.query('SELECT institution_id, product_id, data FROM user_product_configs WHERE user_id = $1 ORDER BY institution_id, product_id', [user.id])
    return response.json(result.rows.map((row) => ({
      institutionId: row.institution_id,
      productId: row.product_id,
      ...row.data,
    })))
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible consultar la configuración del usuario.' })
  }
})

app.put('/api/user-config', async (request, response) => {
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const institutionId = String(request.body?.institutionId ?? '').trim()
  const productId = String(request.body?.productId ?? '').trim()
  if (!institutionId || !productId) return response.status(400).json({ error: 'Faltan institutionId o productId.' })
  const data = { ...request.body }
  delete data.institutionId
  delete data.productId
  const normalized = {
    annualRate: Number.isFinite(Number(data.annualRate)) ? Number(data.annualRate) : 0,
    promoCap: Math.max(0, Number.isFinite(Number(data.promoCap)) ? Number(data.promoCap) : 0),
    excessRate: Math.max(0, Number.isFinite(Number(data.excessRate)) ? Number(data.excessRate) : 0),
    calculationMethod: data.calculationMethod ?? 'compound',
    taxRate: Math.max(0, Number.isFinite(Number(data.taxRate)) ? Number(data.taxRate) : 0),
    daysBase: Math.max(1, Number.isFinite(Number(data.daysBase)) ? Number(data.daysBase) : 365),
    promotionDays: Math.max(0, Number.isFinite(Number(data.promotionDays)) ? Number(data.promotionDays) : 60),
    isActive: data.isActive ?? true,
    updatedAt: new Date().toISOString(),
  }
  try {
    const result = await pool.query('INSERT INTO user_product_configs (user_id, institution_id, product_id, data, updated_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (user_id, institution_id, product_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW() RETURNING institution_id, product_id, data', [user.id, institutionId, productId, normalized])
    return response.json({
      institutionId: result.rows[0].institution_id,
      productId: result.rows[0].product_id,
      ...result.rows[0].data,
    })
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible guardar la configuración del usuario.' })
  }
})

app.get('/api/institutions', async (_request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  try {
    const result = await pool.query('SELECT data FROM institutions ORDER BY name ASC')
    return response.json(result.rows.map((row) => row.data))
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible consultar las instituciones.' })
  }
})

app.post('/api/institutions/sync', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const institutions = Array.isArray(request.body) ? request.body : []
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const institution of institutions) {
      if (!institution?.id || !institution?.name || !Array.isArray(institution.products)) continue
      await client.query('INSERT INTO institutions (id, name, data, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, data = EXCLUDED.data, updated_at = NOW()', [institution.id, institution.name, institution])
    }
    if (institutions.length) await client.query('DELETE FROM institutions WHERE NOT (id = ANY($1::text[]))', [institutions.map((institution) => institution.id)])
    await client.query('COMMIT')
    return response.json({ saved: institutions.length })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    return response.status(500).json({ error: 'No fue posible sincronizar las instituciones.' })
  } finally {
    client.release()
  }
})

app.get('/api/investments', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  try {
    const result = await pool.query('SELECT id, data, created_at FROM investments WHERE user_id = $1 ORDER BY created_at DESC', [user.id])
    return response.json(result.rows.map((row) => ({ ...row.data, id: row.id, createdAt: row.created_at })))
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible consultar las inversiones.' })
  }
})

app.post('/api/investments', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const investment = request.body
  if (!investment?.type || !investment?.institutionId || !investment?.productId) return response.status(400).json({ error: 'Faltan datos requeridos.' })
  try {
    const result = await pool.query('INSERT INTO investments (type, institution_id, product_id, data, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at', [investment.type, investment.institutionId, investment.productId, investment, user.id])
    return response.status(201).json({ ...investment, id: result.rows[0].id, createdAt: result.rows[0].created_at })
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible guardar la inversión.' })
  }
})

app.put('/api/investments/:id', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  const investment = request.body
  if (!investment?.type || !investment?.institutionId || !investment?.productId) return response.status(400).json({ error: 'Faltan datos requeridos.' })
  try {
    const result = await pool.query('UPDATE investments SET type = $1, institution_id = $2, product_id = $3, data = $4 WHERE id = $5 AND user_id = $6 RETURNING id, created_at', [investment.type, investment.institutionId, investment.productId, investment, request.params.id, user.id])
    if (!result.rowCount) return response.status(404).json({ error: 'Inversión no encontrada.' })
    return response.json({ ...investment, id: result.rows[0].id, createdAt: result.rows[0].created_at })
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible actualizar la inversión.' })
  }
})

app.delete('/api/investments/:id', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'DATABASE_URL no está configurada.' })
  const user = await currentUser(request)
  if (!user) return response.status(401).json({ error: 'Sesión no válida.' })
  try {
    const result = await pool.query('DELETE FROM investments WHERE id = $1 AND user_id = $2', [request.params.id, user.id])
    if (!result.rowCount) return response.status(404).json({ error: 'Inversión no encontrada.' })
    return response.status(204).end()
  } catch (error) {
    console.error(error)
    return response.status(500).json({ error: 'No fue posible eliminar la inversión.' })
  }
})

app.use(express.static(frontendDirectory))
app.use((request, response, next) => {
  if (request.path.startsWith('/api/')) return next()
  return response.sendFile(path.join(frontendDirectory, 'index.html'))
})

const startup = ensureSchema().then(() => true).catch((error) => { console.error('No fue posible inicializar PostgreSQL.', error); return false })
if (process.env.NETLIFY !== 'true') startup.then((ready) => { if (ready) app.listen(port, () => console.log(`Finanzia API activa en el puerto ${port}`)) })

export { app, startup }

export function resolveDatabaseConfig(databaseUrl) {
  if (!databaseUrl) return null

  return {
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render') || databaseUrl.includes('neon') || databaseUrl.includes('aws') || databaseUrl.includes('postgres') && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1')
      ? { rejectUnauthorized: false }
      : undefined,
  }
}

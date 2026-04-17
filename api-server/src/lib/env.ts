function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required but was not provided.`);
  }
  return value;
}

export const env = {
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_ISSUER: process.env["JWT_ISSUER"] ?? "smarthomeee",
  JWT_AUDIENCE: process.env["JWT_AUDIENCE"] ?? "smarthomeee",
};


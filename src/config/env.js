const required = [
    "JWT_SECRET",
    "REFRESH_SECRET",
    "DATABASE_URL",
    "FRONTEND_ORIGIN"
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`[warn] Missing env: ${key}`);
    }
  }
  
  export const env = {
    PORT: process.env.PORT || 4000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    REFRESH_SECRET: process.env.REFRESH_SECRET,
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m",
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || "30d",
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "*",
  };
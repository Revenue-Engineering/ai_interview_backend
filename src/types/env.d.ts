// env.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: 'development' | 'production' | 'test';
        PORT: string;
        CORS_ORIGIN: string;
        RATE_LIMIT_WINDOW_MS: string;
        RATE_LIMIT_MAX_REQUESTS: string;
        // Add more variables as needed
    }
}

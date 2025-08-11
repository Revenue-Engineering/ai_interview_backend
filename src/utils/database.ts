// Database client using Singleton pattern
// Following the Singleton pattern to ensure single database connection instance

import { PrismaClient } from '@prisma/client';

// Singleton Pattern: Ensures single database connection instance
class DatabaseClient {
    private static instance: DatabaseClient;
    private prisma: PrismaClient;

    private constructor() {
        // Private constructor to prevent direct instantiation
        this.prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }

    // Singleton Pattern: Static method to get the single instance
    public static getInstance(): DatabaseClient {
        if (!DatabaseClient.instance) {
            DatabaseClient.instance = new DatabaseClient();
        }
        return DatabaseClient.instance;
    }

    // Get the Prisma client instance
    public getClient(): PrismaClient {
        return this.prisma;
    }

    // Graceful shutdown method
    public async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    // Health check method
    public async healthCheck(): Promise<boolean> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
}

// Export a function to get the database client
export const getDatabaseClient = (): PrismaClient => {
    return DatabaseClient.getInstance().getClient();
};

// Export the database client instance for direct use
export const prisma = getDatabaseClient();

// Export the database client class for testing purposes
export { DatabaseClient }; 
import { PrismaClient } from '@prisma/client';

// If running tests, force the DATABASE_URL to the local SQLite dev.db
// This keeps the test suite hermetic and avoids hitting local Postgres accidentally.
if (process.env.NODE_ENV === 'test') {
	process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

// When running tests, override the client's datasource to ensure we use SQLite
const prismaClientOptions: any = {};
if (process.env.NODE_ENV === 'test') {
	prismaClientOptions.datasources = { db: { url: process.env.DATABASE_URL } };
}

export const prisma = new PrismaClient(prismaClientOptions);

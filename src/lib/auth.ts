import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: Role;
            must_change_password: boolean;
        };
    }

    interface User {
        id: string;
        name: string;
        email: string;
        role: Role;
        must_change_password: boolean;
    }
}

declare module 'next-auth' {
    interface JWT {
        id: string;
        role: Role;
        must_change_password: boolean;
    }
}

import { authConfig } from './auth.config';
import type { NextAuthConfig } from 'next-auth';

export const config = {
    ...authConfig,
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: 'jwt' },
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.is_active) return null;

                const isValid = await compare(
                    credentials.password as string,
                    user.password_hash
                );

                if (!isValid) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    must_change_password: user.must_change_password,
                };
            },
        }),
    ],
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);

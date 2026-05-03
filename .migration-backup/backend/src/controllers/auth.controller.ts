import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const authController = {
    /**
     * POST /api/auth/register
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = registerSchema.parse(req.body);

            // Check if user exists
            const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existing.rowCount && existing.rowCount > 0) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            // Insert user
            const result = await pool.query(
                'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
                [email, hash]
            );

            const user = result.rows[0];

            // Generate token
            const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });

            logger.info('User registered', { userId: user.id, email: user.email });

            res.status(201).json({
                user: { id: user.id, email: user.email },
                token,
            });
        } catch (err: any) {
            if (err instanceof z.ZodError) {
                res.status(400).json({ error: err.errors });
                return;
            }
            logger.error('Registration error', err);
            res.status(500).json({ error: 'Registration failed' });
        }
    },

    /**
     * POST /api/auth/login
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = loginSchema.parse(req.body);

            // Find user
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rowCount === 0) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }

            const user = result.rows[0];

            // Check password
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }

            // Generate token
            const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });

            logger.info('User logged in', { userId: user.id });

            res.json({
                user: { id: user.id, email: user.email },
                token,
            });
        } catch (err: any) {
            if (err instanceof z.ZodError) {
                res.status(400).json({ error: err.errors });
                return;
            }
            logger.error('Login error', err);
            res.status(500).json({ error: 'Login failed' });
        }
    },

    /**
     * GET /api/auth/me
     */
    async me(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [userId]);
            if (result.rowCount === 0) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ user: result.rows[0] });
        } catch (err) {
            logger.error('Me error', err);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    }
};

import { Request, Response } from 'express';
import crypto from 'crypto';
import { linkedinService } from '../services/linkedin.service';
import pool from '../config/database';
import { logger } from '../utils/logger';

/**
 * In-memory OAuth state store (CSRF protection).
 *
 * For MVP, this is fine. In production, use Redis with TTL.
 * States expire after 10 minutes and are single-use.
 */
const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

// Cleanup expired states every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
        if (data.expiresAt < now) {
            oauthStates.delete(state);
        }
    }
}, 5 * 60 * 1000);

export const linkedinController = {
    /**
     * GET /api/linkedin/auth-url
     *
     * Generate a LinkedIn OAuth2 authorization URL.
     * Returns JSON with the URL — frontend opens it in a new tab/popup.
     * Requires JWT auth (must know which user is connecting).
     */
    async getAuthUrl(req: Request, res: Response): Promise<void> {
        try {
            const state = crypto.randomBytes(32).toString('hex');

            oauthStates.set(state, {
                userId: req.user!.id,
                expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute expiry
            });

            const url = linkedinService.getAuthUrl(state);

            logger.info('LinkedIn OAuth URL generated', { userId: req.user!.id });
            res.json({ url });
        } catch (err: any) {
            logger.error('Failed to generate auth URL', { error: err.message });
            res.status(500).json({ error: 'Failed to generate authorization URL' });
        }
    },

    /**
     * GET /api/linkedin/callback
     *
     * LinkedIn redirects here after user authorizes.
     * Exchanges the authorization code for tokens, fetches profile,
     * stores encrypted tokens, and redirects to frontend Settings page.
     *
     * No JWT auth — this is an OAuth redirect from LinkedIn.
     */
    async callback(req: Request, res: Response): Promise<void> {
        const { code, state, error: oauthError } = req.query;

        // Handle user-denied or LinkedIn errors
        if (oauthError) {
            logger.warn('LinkedIn OAuth error', { error: oauthError });
            res.redirect('http://localhost:8080/settings?linkedin=error');
            return;
        }

        if (!code || !state) {
            logger.warn('LinkedIn callback missing code or state');
            res.redirect('http://localhost:8080/settings?linkedin=error');
            return;
        }

        // Validate CSRF state
        const storedState = oauthStates.get(state as string);
        if (!storedState || storedState.expiresAt < Date.now()) {
            oauthStates.delete(state as string);
            logger.warn('LinkedIn callback invalid or expired state');
            res.redirect('http://localhost:8080/settings?linkedin=invalid_state');
            return;
        }

        const userId = storedState.userId;
        oauthStates.delete(state as string); // Single-use

        try {
            // 1. Exchange authorization code for tokens
            logger.info('Exchanging LinkedIn auth code', { userId });
            const tokens = await linkedinService.exchangeCode(code as string);

            // 2. Fetch LinkedIn profile
            const profile = await linkedinService.getProfile(tokens.access_token);
            logger.info('LinkedIn profile fetched', {
                userId,
                linkedinName: profile.name,
            });

            // 3. Store encrypted tokens in DB
            await linkedinService.storeTokens(userId, profile, tokens);

            logger.info('LinkedIn connected successfully', {
                userId,
                linkedinUser: profile.name,
                linkedinId: profile.sub,
            });

            res.redirect('http://localhost:8080/settings?linkedin=success');
        } catch (err: any) {
            logger.error('LinkedIn OAuth callback failed', {
                error: err.message,
                userId,
            });
            res.redirect('http://localhost:8080/settings?linkedin=error');
        }
    },

    /**
     * GET /api/linkedin/status
     *
     * Check if the current user has a connected LinkedIn account.
     * Returns connection details (username, last sync, token expiry).
     */
    async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const result = await pool.query(
                `SELECT platform_username, platform_user_id, is_active, last_sync_at, token_expires_at 
                 FROM platform_connections 
                 WHERE user_id = $1 AND platform = 'linkedin'`,
                [req.user!.id]
            );

            if (result.rowCount === 0) {
                res.json({ connected: false });
                return;
            }

            const data = result.rows[0];

            const tokenExpires = new Date(data.token_expires_at);
            const isTokenValid = tokenExpires > new Date();

            res.json({
                connected: data.is_active,
                username: data.platform_username,
                linkedinId: data.platform_user_id,
                lastSync: data.last_sync_at,
                tokenExpires: data.token_expires_at,
                tokenValid: isTokenValid,
            });
        } catch (err: any) {
            logger.error('Failed to get LinkedIn status', { error: err.message });
            res.status(500).json({ error: 'Failed to check LinkedIn status' });
        }
    },

    /**
     * DELETE /api/linkedin/disconnect
     *
     * Remove the user's LinkedIn connection.
     * Clears tokens and deactivates the connection.
     */
    async disconnect(req: Request, res: Response): Promise<void> {
        try {
            await pool.query(
                `UPDATE platform_connections 
                 SET is_active = false, access_token = null, refresh_token = null 
                 WHERE user_id = $1 AND platform = 'linkedin'`,
                [req.user!.id]
            );

            logger.info('LinkedIn disconnected', { userId: req.user!.id });
            res.json({ disconnected: true });
        } catch (err: any) {
            logger.error('LinkedIn disconnect error', { error: err.message });
            res.status(500).json({ error: 'Failed to disconnect LinkedIn' });
        }
    },
};

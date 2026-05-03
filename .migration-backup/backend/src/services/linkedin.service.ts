import axios from 'axios';
import { env } from '../config/env';
import { encrypt, decrypt } from '../utils/encrypt';
import pool from '../config/database';
import { logger } from '../utils/logger';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_UGC_URL = 'https://api.linkedin.com/v2/ugcPosts';

const SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

/**
 * LinkedIn API Service
 *
 * Handles all LinkedIn API interactions:
 * - OAuth2 authorization URL generation
 * - Code-to-token exchange
 * - Token refresh
 * - Profile fetch
 * - Post creation
 * - Encrypted token storage/retrieval
 */
export const linkedinService = {
    /**
     * Generate the OAuth2 authorization URL.
     * User is redirected here to grant permissions.
     */
    getAuthUrl(state: string): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: env.LINKEDIN_CLIENT_ID || '',
            redirect_uri: env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/linkedin/callback',
            state,
            scope: SCOPES.join(' '),
        });
        return `${LINKEDIN_AUTH_URL}?${params}`;
    },

    /**
     * Exchange the authorization code for access + refresh tokens.
     */
    async exchangeCode(code: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    }> {
        const response = await axios.post(LINKEDIN_TOKEN_URL, null, {
            params: {
                grant_type: 'authorization_code',
                code,
                client_id: env.LINKEDIN_CLIENT_ID || '',
                client_secret: env.LINKEDIN_CLIENT_SECRET || '',
                redirect_uri: env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/linkedin/callback',
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    },

    /**
     * Refresh an expired access token using the refresh token.
     */
    async refreshToken(encryptedRefreshToken: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    }> {
        const refreshToken = decrypt(encryptedRefreshToken);
        const response = await axios.post(LINKEDIN_TOKEN_URL, null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: env.LINKEDIN_CLIENT_ID || '',
                client_secret: env.LINKEDIN_CLIENT_SECRET || '',
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    },

    /**
     * Fetch the LinkedIn user's profile via OpenID Connect userinfo endpoint.
     */
    async getProfile(accessToken: string): Promise<{
        sub: string;
        name: string;
        email: string;
        picture?: string;
    }> {
        const response = await axios.get(LINKEDIN_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    },

    /**
     * Store encrypted tokens in the platform_connections table.
     * Uses upsert — if the user already connected LinkedIn, update the tokens.
     */
    /**
     * Store encrypted tokens in the platform_connections table.
     * Uses upsert — if the user already connected LinkedIn, update the tokens.
     */
    async storeTokens(
        userId: string,
        profile: { sub: string; name: string; email: string },
        tokens: { access_token: string; refresh_token?: string; expires_in: number }
    ): Promise<void> {
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        try {
            await pool.query(
                `INSERT INTO platform_connections 
                (user_id, platform, platform_user_id, platform_username, access_token, refresh_token, token_expires_at, is_active, last_sync_at, platform_data)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (user_id, platform) 
                DO UPDATE SET 
                    platform_user_id = EXCLUDED.platform_user_id,
                    platform_username = EXCLUDED.platform_username,
                    access_token = EXCLUDED.access_token,
                    refresh_token = EXCLUDED.refresh_token,
                    token_expires_at = EXCLUDED.token_expires_at,
                    is_active = EXCLUDED.is_active,
                    last_sync_at = EXCLUDED.last_sync_at,
                    platform_data = EXCLUDED.platform_data`,
                [
                    userId,
                    'linkedin',
                    profile.sub,
                    profile.name,
                    encrypt(tokens.access_token),
                    tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
                    expiresAt,
                    true,
                    new Date().toISOString(),
                    { email: profile.email }
                ]
            );
        } catch (error) {
            logger.error('Failed to store LinkedIn tokens', { error });
            throw new Error('Failed to store tokens');
        }
    },

    /**
     * Get a valid (non-expired) access token for the user.
     * If the current token is expired, automatically refreshes it.
     */
    async getValidToken(userId: string): Promise<string> {
        const result = await pool.query(
            `SELECT * FROM platform_connections 
             WHERE user_id = $1 AND platform = 'linkedin' AND is_active = true`,
            [userId]
        );

        if (result.rowCount === 0) {
            throw new Error('LinkedIn not connected. Please connect your account in Settings.');
        }

        const data = result.rows[0];

        // Check if token is expired (with 5-minute buffer)
        const expiresAt = new Date(data.token_expires_at);
        const bufferTime = new Date(Date.now() + 5 * 60 * 1000);

        if (bufferTime < expiresAt) {
            // Token still valid
            return decrypt(data.access_token);
        }

        // Token expired — try to refresh
        if (!data.refresh_token) {
            throw new Error('LinkedIn token expired and no refresh token available. Please reconnect.');
        }

        logger.info('Refreshing expired LinkedIn token', { userId });

        try {
            const newTokens = await this.refreshToken(data.refresh_token);

            // Store refreshed tokens
            await pool.query(
                `UPDATE platform_connections SET
                    access_token = $1,
                    refresh_token = $2,
                    token_expires_at = $3,
                    last_sync_at = $4
                 WHERE user_id = $5 AND platform = 'linkedin'`,
                [
                    encrypt(newTokens.access_token),
                    newTokens.refresh_token ? encrypt(newTokens.refresh_token) : data.refresh_token,
                    new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
                    new Date().toISOString(),
                    userId
                ]
            );

            return newTokens.access_token;
        } catch (refreshError: any) {
            logger.error('Token refresh failed', { error: refreshError.message });
            // Deactivate the connection since we can't refresh
            await pool.query(
                `UPDATE platform_connections SET is_active = false WHERE user_id = $1 AND platform = 'linkedin'`,
                [userId]
            );

            throw new Error('LinkedIn token expired and refresh failed. Please reconnect.');
        }
    },

    /**
     * Create a LinkedIn post via the UGC (User Generated Content) API.
     */
    async createPost(
        accessToken: string,
        authorUrn: string,
        content: string
    ): Promise<{ id: string }> {
        try {
            const response = await axios.post(
                LINKEDIN_UGC_URL,
                {
                    author: `urn:li:person:${authorUrn}`,
                    lifecycleState: 'PUBLISHED',
                    specificContent: {
                        'com.linkedin.ugc.ShareContent': {
                            shareCommentary: { text: content },
                            shareMediaCategory: 'NONE',
                        },
                    },
                    visibility: {
                        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'X-Restli-Protocol-Version': '2.0.0',
                    },
                }
            );

            return { id: response.headers['x-restli-id'] || response.data.id };
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;

            if (status === 429) {
                throw new Error('LinkedIn rate limit exceeded. Try again later.');
            }
            if (status === 401) {
                throw new Error('LinkedIn token expired. Please reconnect your account.');
            }

            logger.error('LinkedIn API error', { status, message });
            throw new Error(`LinkedIn post failed: ${message}`);
        }
    },

    /**
     * Fetch social metrics (likes, comments) for a given post URN.
     * Throws 'POST_DELETED' if the post no longer exists.
     */
    async getPostMetrics(accessToken: string, urn: string): Promise<{ likes: number; comments: number }> {
        // 1. Verify the post actually still exists and scrape REAL metrics directly from HTML.
        // We use the public embed endpoint because the main API returns a 403 Scope Error 
        // even if the post is deleted, which masks the 404, and blocks reading real metrics natively.
        let scrapedLikes = 0;
        let scrapedComments = 0;

        try {
            const embedRes = await axios.get(`https://www.linkedin.com/embed/feed/update/${encodeURIComponent(urn)}`);
            const html = embedRes.data;

            // Extract using generic regex to bypass API auth blocks
            const likesMatch = html.match(/"numLikes":(\d+)/i) || html.match(/>([\d,]+)\s+Likes?</i) || html.match(/([\d,]+)\s+Reactions?/i);
            const commentsMatch = html.match(/"numComments":(\d+)/i) || html.match(/>([\d,]+)\s+Comments?</i) || html.match(/([\d,]+)\s+Comments?/i);

            if (likesMatch) scrapedLikes = parseInt(likesMatch[1].replace(/,/g, ''), 10) || 0;
            if (commentsMatch) scrapedComments = parseInt(commentsMatch[1].replace(/,/g, ''), 10) || 0;

        } catch (embedError: any) {
            if (embedError.response?.status === 404) {
                logger.info('Post detected as natively deleted via embed check', { urn });
                throw new Error('POST_DELETED');
            }
        }

        // 2. Try fetching actual metrics if we somehow gained Marketing Developer permission 
        try {
            const response = await axios.get(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urn)}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            });

            return {
                likes: response.data.likesSummary?.totalLikes || 0,
                comments: response.data.commentsSummary?.totalFirstLevelComments || 0,
            };
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 404) {
                throw new Error('POST_DELETED');
            }
            if (status === 403) {
                logger.info(`Returning scraped metrics for ${urn} due to API 403 restriction`, { scrapedLikes, scrapedComments });
                return {
                    likes: scrapedLikes,
                    comments: scrapedComments,
                };
            }
            logger.error('Failed to fetch post metrics from LinkedIn', { urn, error: error.message });
            throw error;
        }
    },

    /**
     * Delete a native LinkedIn post using its URN.
     */
    async deletePost(accessToken: string, urn: string): Promise<boolean> {
        try {
            // Attempt standard share deletion
            const endpoint = urn.includes('ugcPost') ? 'ugcPosts' : 'shares';
            await axios.delete(`https://api.linkedin.com/v2/${endpoint}/${encodeURIComponent(urn)}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            });
            return true;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 404) {
                 return true; // Already deleted
            }
            logger.error('Failed to delete LinkedIn post', { urn, message: error.response?.data?.message || error.message });
            throw new Error(`Failed to forcefully delete post: ${error.message}`);
        }
    },
};

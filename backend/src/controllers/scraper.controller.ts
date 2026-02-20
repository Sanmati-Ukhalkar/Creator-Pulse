import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import pool from '../config/database';
import Parser from 'rss-parser';
import axios from 'axios';

const rssParser = new Parser();

interface ScrapedItem {
    url: string;
    title: string;
    content: string;
    markdown?: string | null;
    html?: string | null;
    published_at: string;
    metadata: any;
}

export const scraperController = {
    /**
     * POST /api/scraper/run
     * Run content scraper for a source
     */
    async run(req: Request, res: Response) {
        const { source_id, user_id } = req.body;

        try {
            logger.info('Starting content scrape', { source_id, user_id });

            // 1. Get Source Details
            const sourceResult = await pool.query(
                'SELECT * FROM sources WHERE id = $1 AND user_id = $2',
                [source_id, user_id]
            );

            if (sourceResult.rowCount === 0) {
                res.status(404).json({ error: 'Source not found' });
                return;
            }

            const source = sourceResult.rows[0];

            // 2. Update Sync Status to 'syncing'
            await pool.query(
                `UPDATE sources SET sync_status = 'syncing', last_sync_at = NOW(), sync_error = NULL WHERE id = $1`,
                [source_id]
            );

            let scrapedContent: ScrapedItem[] = [];
            let rateLimited = false;

            // 3. Route to Scraper
            try {
                if (source.source_type === 'rss') {
                    scrapedContent = await scrapeRSS(source.source_url);
                } else if (source.source_type === 'twitter') {
                    // Check if tweet_url is provided for single import, otherwise scrape timeline
                    // The original code handled tweet_url in run() if passed, but run() usually runs full sync.
                    // If tweet_url is passed, it usually goes to importTweet endpoint.
                    // Here we assume run() is for full source sync (timeline).
                    const tw = await scrapeTwitterTimeline(source);
                    if (tw.rateLimited) {
                        rateLimited = true;
                        await pool.query(
                            `UPDATE sources SET sync_status = 'error', sync_error = $1 WHERE id = $2`,
                            [tw.retryAfter ? `Rate limited; retry after ${tw.retryAfter}` : 'Rate limited by Twitter API', source_id]
                        );
                    } else {
                        scrapedContent = tw.items;
                        if (scrapedContent.length > 0 && scrapedContent[0].metadata?.tweet_id) {
                            const newMetrics = { ...(source.metrics || {}), last_tweet_id: scrapedContent[0].metadata.tweet_id };
                            await pool.query('UPDATE sources SET metrics = $1 WHERE id = $2', [newMetrics, source_id]);
                        }
                    }
                } else {
                    throw new Error(`Unsupported source type: ${source.source_type}`);
                }
            } catch (scrapeErr: any) {
                await pool.query(
                    `UPDATE sources SET sync_status = 'error', sync_error = $1 WHERE id = $2`,
                    [scrapeErr.message, source_id]
                );
                throw scrapeErr;
            }

            if (rateLimited) {
                res.json({ success: false, message: 'Rate limited' });
                return;
            }

            // 4. Store Content (Deduplicate)
            let insertedCount = 0;
            if (scrapedContent.length > 0) {
                for (const item of scrapedContent) {
                    const hash = generateContentHash(item.content);

                    // Check deduplication
                    const existing = await pool.query(
                        'SELECT id FROM ingested_contents WHERE user_id = $1 AND hash = $2',
                        [user_id, hash]
                    );

                    if (existing.rowCount === 0) {
                        await pool.query(
                            `INSERT INTO ingested_contents (user_id, source_id, url, title, raw_content, content_md, content_html, hash, published_at, metadata, status)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'fetched')`,
                            [user_id, source_id, item.url, item.title, item.content, item.markdown || null, item.html || null, hash, item.published_at, item.metadata]
                        );
                        insertedCount++;
                    }
                }
            }

            // 5. Update Source Status to Success
            const currentMetrics = source.metrics || {};
            const newMetrics = {
                ...currentMetrics,
                last_scrape_count: scrapedContent.length,
                total_scraped: (currentMetrics.total_scraped || 0) + scrapedContent.length
            };

            await pool.query(
                `UPDATE sources SET sync_status = 'success', last_sync_at = NOW(), metrics = $1 WHERE id = $2`,
                [newMetrics, source_id]
            );

            logger.info('Scrape completed', { source_id, scraped: scrapedContent.length, inserted: insertedCount });

            res.json({ success: true, scraped_count: scrapedContent.length, inserted_count: insertedCount });

        } catch (error: any) {
            logger.error('Scraper error', { error: error.message });
            res.status(500).json({ error: 'Failed to run scraper' });
        }
    },

    /**
     * POST /api/scraper/import-tweet
     * Import a single tweet by URL
     */
    async importTweet(req: Request, res: Response) {
        try {
            const { source_id, user_id, tweet_url } = req.body;
            logger.info('Import tweet triggered', { source_id, user_id, tweet_url });

            if (!tweet_url) {
                res.status(400).json({ error: 'tweet_url is required' });
                return;
            }

            const items = await importTweetByUrl(tweet_url);

            // Insert
            if (items.length > 0) {
                const item = items[0];
                const hash = generateContentHash(item.content);
                await pool.query(
                    `INSERT INTO ingested_contents (user_id, source_id, url, title, raw_content, content_md, content_html, hash, published_at, metadata, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'fetched')
                     ON CONFLICT (user_id, hash) DO NOTHING`, // Use Postgres "ON CONFLICT" if unique constraint exists, else logic above
                    [user_id, source_id, item.url, item.title, item.content, item.markdown || null, item.html || null, hash, item.published_at, item.metadata]
                );
            }

            res.json({ success: true, message: "Tweet imported" });
        } catch (error: any) {
            logger.error('Import tweet error', { error: error.message });
            res.status(500).json({ error: 'Failed to import tweet' });
        }
    },

    /**
     * POST /api/scraper/validate-rss
     * Validate RSS feed URL
     */
    async validateRss(req: Request, res: Response) {
        try {
            const { url } = req.body;
            const items = await scrapeRSS(url);
            res.json({ valid: items.length > 0 });
        } catch (error: any) {
            logger.error('Validate RSS error', { error: error.message });
            res.status(500).json({ error: 'Failed to validate RSS feed' });
        }
    }
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

async function scrapeRSS(url: string): Promise<ScrapedItem[]> {
    try {
        const feed = await rssParser.parseURL(url);
        return (feed.items || []).slice(0, 20).map(item => ({
            url: item.link || '',
            title: (item.title || '').trim(),
            content: (item.contentSnippet || item.content || '').trim(),
            published_at: item.isoDate || new Date().toISOString(),
            metadata: {
                source_type: 'rss',
                feed_url: url
            }
        }));
    } catch (err: any) {
        logger.error('RSS Parse Error', { url, msg: err.message });
        throw new Error(`Failed to parse RSS: ${err.message}`);
    }
}

async function scrapeTwitterTimeline(source: any): Promise<{ items: ScrapedItem[], rateLimited: boolean, retryAfter?: string }> {
    const token = process.env.TWITTER_BEARER_TOKEN;
    if (!token) {
        logger.warn('Missing TWITTER_BEARER_TOKEN');
        return { items: [], rateLimited: false };
    }

    const username = source.source_config?.username || source.source_url?.split('/').pop()?.replace('@', '');
    if (!username) return { items: [], rateLimited: false };

    try {
        // 1. Get User ID
        const userResp = await axios.get(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true
        });

        if (userResp.status === 429) return { items: [], rateLimited: true };
        if (userResp.status !== 200) return { items: [], rateLimited: false };

        const userId = userResp.data?.data?.id;
        if (!userId) return { items: [], rateLimited: false };

        // 2. Get Tweets
        const params = new URLSearchParams({
            max_results: '20',
            'tweet.fields': 'created_at,entities',
            exclude: 'retweets,replies'
        });

        const sinceId = source.metrics?.last_tweet_id;
        if (sinceId) params.append('since_id', String(sinceId));

        const tlResp = await axios.get(`https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true
        });

        if (tlResp.status === 429) {
            const reset = tlResp.headers['x-rate-limit-reset'];
            const retryAfter = reset ? new Date(Number(reset) * 1000).toISOString() : undefined;
            return { items: [], rateLimited: true, retryAfter };
        }

        if (tlResp.status !== 200) return { items: [], rateLimited: false };

        const tweets = tlResp.data.data || [];
        const items = tweets.map((t: any) => ({
            url: `https://twitter.com/${username}/status/${t.id}`,
            title: (t.text || '').substring(0, 80),
            content: t.text || '',
            published_at: t.created_at || new Date().toISOString(),
            metadata: {
                source_type: 'twitter',
                tweet_id: t.id,
                username
            }
        }));

        return { items, rateLimited: false };

    } catch (err: any) {
        logger.error('Twitter API error', { error: err.message });
        return { items: [], rateLimited: false };
    }
}

async function importTweetByUrl(tweetUrl: string): Promise<ScrapedItem[]> {
    try {
        // Use Twitter OEmbed (no token needed usually, or public token)
        // Actually, axios fetch of publish.twitter.com
        const oembedUrl = `https://publish.twitter.com/oembed?omit_script=true&hide_thread=true&url=${encodeURIComponent(tweetUrl)}`;
        const resp = await axios.get(oembedUrl);

        const html = resp.data.html || '';
        const text = html.replace(/<[^>]*>?/gm, '').trim(); // Simple strip tags

        return [{
            url: tweetUrl,
            title: text.substring(0, 80),
            content: text,
            html: html,
            published_at: new Date().toISOString(),
            metadata: {
                source_type: 'twitter',
                imported: true
            }
        }];
    } catch (err: any) {
        logger.error('Tweet Import Error', { error: err.message });
        throw new Error('Failed to import tweet');
    }
}

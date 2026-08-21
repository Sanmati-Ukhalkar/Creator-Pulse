import { linkedinService } from '../src/services/linkedin.service';
import pool from '../src/config/database';
import axios from 'axios';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';
const DRAFT_ID = 'cbca964a-a535-4fa7-9816-0fac36d195f8';

(async () => {
    try {
        console.log("Fetching linkedin connection...");
        const connResult = await pool.query(
            `SELECT platform_user_id, access_token FROM platform_connections 
             WHERE user_id = $1 AND platform = 'linkedin' AND is_active = true`,
            [USER_ID]
        );
        const connection = connResult.rows[0];
        if (!connection) {
            console.error("No active linkedin connection!");
            process.exit(1);
        }

        console.log("Found connection for URN:", connection.platform_user_id);
        
        console.log("Fetching draft...");
        const draftResult = await pool.query(
            `SELECT metadata, content FROM drafts WHERE id = $1 AND user_id = $2`,
            [DRAFT_ID, USER_ID]
        );
        const draft = draftResult.rows[0];
        let imageToPublish;
        if (draft.metadata && draft.metadata.image_b64) {
            imageToPublish = { b64: draft.metadata.image_b64, format: 'jpeg' };
            console.log("Found image in draft metadata!");
        } else {
            console.log("No image in draft metadata");
        }

        console.log("Attempting to publish...");
        const result = await linkedinService.createPost(
            connection.access_token,
            connection.platform_user_id,
            draft.content || "Fallback content",
            imageToPublish
        );

        console.log("Published! Result:", result);

    } catch (err: any) {
        console.error("Publish error:", err.message);
        if (err.response) {
            console.error("Response data:", err.response.data);
        }
    } finally {
        process.exit(0);
    }
})();

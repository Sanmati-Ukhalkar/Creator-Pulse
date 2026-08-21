import { linkedinService } from '../src/services/linkedin.service';
import pool from '../src/config/database';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';

(async () => {
    try {
        console.log("Fetching linkedin token...");
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
        
        console.log("Attempting to publish...");
        const result = await linkedinService.createPost(
            connection.access_token,
            connection.platform_user_id,
            "Test post from backend debug script"
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

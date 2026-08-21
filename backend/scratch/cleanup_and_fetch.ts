import pool from '../src/config/database';
import { liveSearchService } from '../src/services/live_search.service';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';

(async () => {
  try {
    console.log("Cleaning up mock TechCrunch data...");
    
    // Find the TechCrunch source
    const tcSource = await pool.query("SELECT id FROM sources WHERE user_id = $1 AND source_name = 'TechCrunch AI'", [USER_ID]);
    if (tcSource.rowCount && tcSource.rowCount > 0) {
        const sourceId = tcSource.rows[0].id;
        
        // Delete its contents
        await pool.query("DELETE FROM ingested_contents WHERE source_id = $1", [sourceId]);
        console.log("Deleted mock ingested_contents");
        
        // Delete the source
        await pool.query("DELETE FROM sources WHERE id = $1", [sourceId]);
        console.log("Deleted TechCrunch mock source");
    }

    console.log("Fetching REAL data using Tavily Live Data Engine...");
    
    // Get user's niche and target audience
    const user = await pool.query("SELECT niche, target_audience FROM users WHERE id = $1", [USER_ID]);
    const niche = (user.rowCount && user.rowCount > 0) ? (user.rows[0].niche || "tech") : "tech";
    const target = (user.rowCount && user.rowCount > 0) ? (user.rows[0].target_audience || "developers") : "developers";

    console.log(`Triggering generateAndRunQueries with niche=${niche} and target=${target}`);
    await liveSearchService.generateAndRunQueries(USER_ID, niche, target);
    
    console.log("Done! Real data should now be in the database.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();

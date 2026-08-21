import { liveSearchService } from '../src/services/live_search.service';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';

(async () => {
    try {
        console.log("Triggering NewsAPI query to seed source... Key:", process.env.NEWS_API_KEY || 'MISSING');
        await liveSearchService.runNewsApiQuery(USER_ID, 'dummy-query-id', 'technology');
        console.log("Done.");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();

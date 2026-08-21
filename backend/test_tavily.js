const { liveSearchService } = require('./src/services/live_search.service');

async function testTavily() {
  const userId = '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c';
  const queryId = '29a8fd70-e77b-43a9-8315-3ef89f51f9fb';
  const queryStr = 'AI in healthcare news 2023';
  console.log('Testing Tavily...');
  const res = await liveSearchService.runListeningQuery(userId, queryId, queryStr);
  console.log('Result:', res);
}
testTavily();

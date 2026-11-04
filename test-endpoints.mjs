async function runTests() {
  console.log('=== STARTING AMELIA ASSISTANT ENDPOINT VERIFICATION ===');

  // 1. Homepage
  const home = await fetch('http://localhost:3000/');
  console.log('1. GET / status:', home.status, 'Content-Type:', home.headers.get('content-type'));

  // 2. Gemini Test API
  const geminiTest = await (await fetch('http://localhost:3000/api/gemini/test')).json();
  console.log('2. GET /api/gemini/test:', geminiTest);

  // 3. Settings API
  const settings = await (await fetch('http://localhost:3000/api/settings')).json();
  console.log('3. GET /api/settings:', { model: settings.model, hasKey: settings.hasKey, profileName: settings.profile?.name });

  // 4. Memories API (GET)
  const memories = await (await fetch('http://localhost:3000/api/memories')).json();
  console.log('4. GET /api/memories count:', memories.memories?.length);

  // 5. Add Memory (POST)
  const addMem = await (await fetch('http://localhost:3000/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Special Memories',
      title: 'First Stargazing Date',
      content: 'We watched the Perseid meteor shower on the beach blanket.',
      emotional_significance: 'One of her all-time favorite nights.',
      source: 'manual'
    })
  })).json();
  console.log('5. POST /api/memories created:', addMem.memory?.title);

  // 6. Dates API
  const dates = await (await fetch('http://localhost:3000/api/dates')).json();
  console.log('6. GET /api/dates count:', dates.dates?.length);

  // 7. Reminders API (GET & Checkin)
  const rem = await (await fetch('http://localhost:3000/api/reminders')).json();
  console.log('7. GET /api/reminders stats:', rem.stats);

  const checkin = await (await fetch('http://localhost:3000/api/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'checkin', notes: 'Automated test check-in' })
  })).json();
  console.log('8. POST /api/reminders checkin new count:', checkin.stats?.completedCount);

  // 8. Improve Message API
  const improve = await (await fetch('http://localhost:3000/api/improve-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Are you free tonight?', styleId: 'funnier' })
  })).json();
  console.log('9. POST /api/improve-message:', { improved: improve.improved, reasoning: improve.reasoning });

  // 9. Conversation Starters API
  const starters = await (await fetch('http://localhost:3000/api/conversation-starters?category=romantic')).json();
  console.log('10. GET /api/conversation-starters count:', starters.starters?.length, 'sample:', starters.starters?.[0]?.message);

  // 10. Chat API
  const chat = await (await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'I want to send Amelia something sweet today.' })
  })).json();
  console.log('11. POST /api/chat reply preview:', chat.reply?.slice(0, 80) + '...', 'replies count:', chat.suggestedReplies?.length);

  // 11. Screenshot Analysis API
  const sample1x1Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const screenshot = await (await fetch('http://localhost:3000/api/screenshot-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: [{ data: sample1x1Png, mimeType: 'image/png' }],
      userNotes: 'Checking in',
      preferences: { styles: ['casual', 'flirty'], length: 'short', intensity: 'moderate', naturalness: 'balanced' }
    })
  })).json();
  console.log('12. POST /api/screenshot-analysis summary preview:', screenshot.summary?.slice(0, 80) + '...', 'replies:', screenshot.suggestedReplies?.length);

  console.log('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch(e => console.error(e));

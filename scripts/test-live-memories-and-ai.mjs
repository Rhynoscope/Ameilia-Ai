const BASE_URL = "https://amelia-assistant.ryangamming13.workers.dev";

async function runTests() {
  console.log(`\n=== 1. TESTING LIVE DEPLOYMENT ENDPOINTS (${BASE_URL}) ===\n`);

  // 1. Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    console.log(`[Health Check] Status: ${healthRes.status}`);
    const healthData = await healthRes.json();
    console.log(`[Health Check] Response:`, JSON.stringify(healthData));
  } catch (e) {
    console.error(`[Health Check] Failed:`, e.message);
  }

  // 2. Gemini test
  try {
    const geminiRes = await fetch(`${BASE_URL}/api/gemini/test`);
    console.log(`\n[Gemini Test] Status: ${geminiRes.status}`);
    const geminiData = await geminiRes.json();
    console.log(`[Gemini Test] Response:`, JSON.stringify(geminiData));
  } catch (e) {
    console.error(`[Gemini Test] Failed:`, e.message);
  }

  // 3. Memories API
  try {
    const memRes = await fetch(`${BASE_URL}/api/memories`);
    console.log(`\n[Memories API] Status: ${memRes.status}`);
    const memData = await memRes.json();
    console.log(`[Memories API] Total Memories Returned: ${memData.memories?.length}`);

    // Verify categories
    const categoriesCount = {};
    for (const m of memData.memories || []) {
      categoriesCount[m.category] = (categoriesCount[m.category] || 0) + 1;
    }
    console.log(`[Memories API] Distinct Categories Populated: ${Object.keys(categoriesCount).length}`);
    console.log(`[Memories API] Category Counts:`, JSON.stringify(categoriesCount, null, 2));

    // Check uncertain items
    const uncertain = (memData.memories || []).filter((m) => m.status === "uncertain");
    console.log(`[Memories API] Uncertain Items Count: ${uncertain.length} (Title: ${uncertain.map(u => u.title).join(", ")})`);

    // Check promises
    const promises = (memData.memories || []).filter((m) => m.status === "promise");
    console.log(`[Memories API] Promises Count: ${promises.length}`);
  } catch (e) {
    console.error(`[Memories API] Failed:`, e.message);
  }

  // 4. Test AI Chat Retrieval: Question 1 (Favorite Foods)
  console.log(`\n=== 2. TESTING AI RECALL IN LIVE CHAT (/api/chat) ===\n`);
  await testChatTurn("Hey Ameilia, what are my girlfriend's favorite foods and snacks? What should I order or surprise her with?", "Food Preferences");

  // Question 2 (Favorite Games)
  await testChatTurn("Which games does she love playing the most? What should we play together tonight?", "Gaming Favorites");

  // Question 3 (Anniversary and Promises)
  await testChatTurn("Can you remind me when our anniversary is, and what major promises we made to each other?", "Anniversary & Promises");

  // Question 4 (Inside Jokes & Banter)
  await testChatTurn("What are some of our best inside jokes that I can tease her about?", "Inside Jokes");

  // Question 5 (Dislikes & Thumbs-Up Guardrail)
  await testChatTurn("She just texted me saying she is exhausted after work. Give me 3 reply options. Also, is it okay if I just send her a thumbs up emoji?", "Thumbs-up Guardrail & Post-Work Empathy");
}

async function testChatTurn(message, testLabel) {
  try {
    console.log(`\n--- Test: ${testLabel} ---`);
    console.log(`User Prompt: "${message}"`);
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        message,
        preferences: {},
        thinkingMode: "quick",
      }),
    });

    console.log(`HTTP Status: ${res.status}`);
    const data = await res.json();
    if (data.reply) {
      console.log(`AI Response Preview (first 400 chars):`);
      console.log(data.reply.slice(0, 400) + "...\n");
      if (data.suggestedReplies) {
        console.log(`Suggested Replies Generated (${data.suggestedReplies.length}):`);
        data.suggestedReplies.forEach((r, idx) => {
          console.log(`  ${idx + 1}. [${r.tone}] "${r.message}"`);
        });
      }
    } else {
      console.log(`Response Data:`, JSON.stringify(data));
    }
  } catch (e) {
    console.error(`Chat Test Failed:`, e.message);
  }
}

runTests();

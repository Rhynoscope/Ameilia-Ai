import assert from "node:assert";

const BASE_URL = "http://127.0.0.1:8787";

async function runFullVerification() {
  console.log("=== COMPREHENSIVE CLOUDFLARE WORKERS API VERIFICATION ===");

  // 1. Homepage loads
  console.log("\n[1] Testing Homepage (GET /)...");
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, "Homepage should return 200");
  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes("Amelia"), "Homepage should contain 'Amelia'");
  console.log("✓ Homepage returned HTTP 200");

  // 2. Health check
  console.log("\n[2] Testing Health Check (GET /api/health)...");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  console.log("Health Data:", JSON.stringify(healthData, null, 2));
  assert.strictEqual(healthData.status, "ok");
  assert.strictEqual(healthData.gemini.configured, true);
  console.log("✓ Health Check returned HTTP 200 with active Gemini and D1/SQLite");

  // 3. Gemini test endpoint
  console.log("\n[3] Testing Gemini Test (GET /api/gemini/test)...");
  const geminiTestRes = await fetch(`${BASE_URL}/api/gemini/test`);
  assert.strictEqual(geminiTestRes.status, 200);
  const geminiTestData = await geminiTestRes.json();
  console.log("Gemini Test Result:", geminiTestData);
  assert.strictEqual(geminiTestData.success, true);
  console.log("✓ Gemini direct connection returned HTTP 200");

  // 4. Settings load and save
  console.log("\n[4] Testing Settings (GET & POST /api/settings)...");
  const settingsGetRes = await fetch(`${BASE_URL}/api/settings`);
  assert.strictEqual(settingsGetRes.status, 200);
  const settingsData = await settingsGetRes.json();
  console.log("Current Model:", settingsData.model);
  assert.ok(settingsData.profile, "Should have profile");

  const settingsPostRes = await fetch(`${BASE_URL}/api/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme: "romantic-light", privacyAcknowledged: true }),
  });
  assert.strictEqual(settingsPostRes.status, 200);
  console.log("✓ Settings GET and POST returned HTTP 200");

  // 5. Memories load and save
  console.log("\n[5] Testing Memories (GET & POST /api/memories)...");
  const memGetRes = await fetch(`${BASE_URL}/api/memories`);
  assert.strictEqual(memGetRes.status, 200);
  const memData = await memGetRes.json();
  console.log("Loaded memories count:", memData.memories.length);
  assert.ok(memData.memories.length > 0, "Initial memories should be seeded");

  const newMemRes = await fetch(`${BASE_URL}/api/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "Inside Jokes",
      title: "The Espresso Incident",
      content: "When Amelia tried making latte art and it turned into a potato.",
      emotional_significance: "Laughed on FaceTime for 20 minutes.",
    }),
  });
  assert.strictEqual(newMemRes.status, 200);
  const newMem = await newMemRes.json();
  console.log("Created memory ID:", newMem.memory?.id);
  console.log("✓ Memories GET and POST returned HTTP 200");

  // 6. Reminders load and checkin
  console.log("\n[6] Testing Reminders (GET & POST /api/reminders)...");
  const remGetRes = await fetch(`${BASE_URL}/api/reminders`);
  assert.strictEqual(remGetRes.status, 200);
  const remData = await remGetRes.json();
  assert.ok(remData.settings, "Should return reminder settings");

  const remCheckinRes = await fetch(`${BASE_URL}/api/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "checkin", notes: "Sent her a sweet voice message" }),
  });
  assert.strictEqual(remCheckinRes.status, 200);
  console.log("✓ Reminders GET and POST returned HTTP 200");

  // 7. Important dates
  console.log("\n[7] Testing Dates (GET & POST /api/dates)...");
  const datesGetRes = await fetch(`${BASE_URL}/api/dates`);
  assert.strictEqual(datesGetRes.status, 200);
  const datesData = await datesGetRes.json();
  assert.ok(datesData.dates.length > 0, "Should have initial dates");

  const newDateRes = await fetch(`${BASE_URL}/api/dates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Amelia's Graduation Celebration",
      event_date: "2026-12-15",
      category: "milestone",
      reminder_days_before: 14,
    }),
  });
  assert.strictEqual(newDateRes.status, 200);
  const newDate = await newDateRes.json();
  console.log("Created Date ID:", newDate.date?.id);

  // Clean up test date
  const delDateRes = await fetch(`${BASE_URL}/api/dates?id=${newDate.date.id}`, { method: "DELETE" });
  assert.strictEqual(delDateRes.status, 200);
  console.log("✓ Dates GET, POST, and DELETE returned HTTP 200");

  // 8. Chat message with Gemini & Suggested Replies
  console.log("\n[8] Testing Chat & Gemini (POST /api/chat)...");
  const testConvoId = `convo_${Date.now()}`;
  const chatRes = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: testConvoId,
      message: "Amelia texted: 'I miss you so much today :('. Give me 3 sweet, reassuring text messages to send her.",
      thinkingMode: "quick",
    }),
  });
  assert.strictEqual(chatRes.status, 200, "Chat should return 200");
  const chatData = await chatRes.json();
  console.log("Amelia AI response preview:", chatData.reply.slice(0, 150) + "...");
  console.log("Suggested replies count:", chatData.suggestedReplies?.length);
  assert.ok(chatData.reply && chatData.reply.length > 20);
  assert.ok(Array.isArray(chatData.suggestedReplies) && chatData.suggestedReplies.length >= 2);
  console.log("✓ Chat POST returned HTTP 200 with realistic suggested replies!");

  // 9. Conversation Listing
  console.log("\n[9] Testing Conversation History (GET /api/chat)...");
  const convosRes = await fetch(`${BASE_URL}/api/chat`);
  assert.strictEqual(convosRes.status, 200);
  const convosData = await convosRes.json();
  console.log("Total conversations saved:", convosData.conversations.length);
  const found = convosData.conversations.find(c => c.id === testConvoId);
  assert.ok(found, "Created conversation must be persisted");
  console.log("Saved conversation title:", found.title);
  console.log("✓ Conversations saved and returned HTTP 200");

  // 10. Delete All Conversations
  console.log("\n[10] Testing Conversation Deletion (DELETE /api/chat)...");
  const delChatRes = await fetch(`${BASE_URL}/api/chat`, { method: "DELETE" });
  assert.strictEqual(delChatRes.status, 200);
  const afterDelRes = await fetch(`${BASE_URL}/api/chat`);
  const afterDelData = await afterDelRes.json();
  assert.strictEqual(afterDelData.conversations.length, 0, "Conversations should be empty");
  console.log("✓ Conversation deletion returned HTTP 200");

  console.log("\n========================================================");
  console.log("🎉 ALL 10 VERIFICATION TESTS PASSED WITH ZERO HTTP 500 ERRORS!");
  console.log("========================================================");
}

runFullVerification().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});

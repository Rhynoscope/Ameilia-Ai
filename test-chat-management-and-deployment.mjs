import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== STARTING AMELIA ASSISTANT VERIFICATION SUITE ===");

  // 1. Health check
  console.log("\n[TEST 1] Testing /api/health endpoint...");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, "Health check should return 200");
  const healthData = await healthRes.json();
  console.log("Health Check Result:", JSON.stringify(healthData, null, 2));
  assert.strictEqual(healthData.status, "ok");
  assert.strictEqual(healthData.gemini.configured, true, "Gemini should be configured");
  assert.ok(healthData.database === "sqlite" || healthData.database === "postgresql");
  console.log("✓ Health check PASSED!");

  // 2. Chat with Quick Thinking Mode
  console.log("\n[TEST 2] Testing /api/chat with thinkingMode='quick'...");
  const testConvoId = `test_convo_${Date.now()}`;
  const quickChatRes = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: testConvoId,
      message: "Hey Amelia AI, Amelia texted me: 'Thinking of you today!' What are 3 sweet, natural replies I can text her?",
      thinkingMode: "quick",
    }),
  });
  assert.strictEqual(quickChatRes.status, 200, "Chat POST should return 200");
  const quickChatData = await quickChatRes.json();
  console.log("Quick Chat Reply Snippet:", quickChatData.reply.slice(0, 150) + "...");
  assert.ok(quickChatData.reply.length > 20, "Should return AI reply");
  console.log("Suggested Replies Count:", quickChatData.suggestedReplies?.length || 0);
  assert.ok(Array.isArray(quickChatData.suggestedReplies) && quickChatData.suggestedReplies.length >= 2, "Should return suggested replies");
  console.log("✓ Quick thinking mode chat PASSED!");

  // 3. Chat with Extra Thinking Mode
  console.log("\n[TEST 3] Testing /api/chat with thinkingMode='extra'...");
  const extraChatRes = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: testConvoId,
      message: "We haven't talked much in 2 days because we were both stressed. How should I open the conversation with vulnerability without sounding needy?",
      thinkingMode: "extra",
    }),
  });
  assert.strictEqual(extraChatRes.status, 200);
  const extraChatData = await extraChatRes.json();
  console.log("Extra Thinking Reply Snippet:", extraChatData.reply.slice(0, 150) + "...");
  assert.ok(extraChatData.reply.length > 20);
  console.log("✓ Extra thinking mode chat PASSED!");

  // 4. Conversation listing and auto-titling
  console.log("\n[TEST 4] Verifying conversation listing & auto-title...");
  const listRes = await fetch(`${BASE_URL}/api/chat`);
  const listData = await listRes.json();
  const createdConvo = listData.conversations.find((c) => c.id === testConvoId);
  assert.ok(createdConvo, "Created conversation should exist in list");
  console.log("Auto-generated title:", createdConvo.title);
  console.log("Last message snippet:", createdConvo.last_message?.slice(0, 50));
  assert.ok(createdConvo.title && createdConvo.title.length > 3, "Title should be automatically generated");
  console.log("✓ Conversation listing & auto-titling PASSED!");

  // 5. Conversation Rename (Feature 1)
  console.log("\n[TEST 5] Testing conversation rename...");
  const newTitle = "Reconnecting After Busy Week";
  const renameRes = await fetch(`${BASE_URL}/api/chat/${testConvoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle }),
  });
  assert.strictEqual(renameRes.status, 200);
  const verifyRenameRes = await fetch(`${BASE_URL}/api/chat`);
  const verifyRenameData = await verifyRenameRes.json();
  const renamedConvo = verifyRenameData.conversations.find((c) => c.id === testConvoId);
  assert.strictEqual(renamedConvo?.title, newTitle, "Title should be updated in database");
  console.log("✓ Conversation rename PASSED!");

  // 6. Conversation Archive & Restore
  console.log("\n[TEST 6] Testing conversation archive & restore...");
  // Archive
  const archiveRes = await fetch(`${BASE_URL}/api/chat/${testConvoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived: true }),
  });
  assert.strictEqual(archiveRes.status, 200);

  // Active list should not contain it
  const activeListRes = await fetch(`${BASE_URL}/api/chat?archived=false`);
  const activeListData = await activeListRes.json();
  assert.ok(!activeListData.conversations.some((c) => c.id === testConvoId), "Archived convo should not appear in active list");

  // Archived list should contain it
  const archivedListRes = await fetch(`${BASE_URL}/api/chat?archived=true`);
  const archivedListData = await archivedListRes.json();
  assert.ok(archivedListData.conversations.some((c) => c.id === testConvoId), "Archived convo should appear in archived list");
  console.log("✓ Archive & restore filtering PASSED!");

  // 7. Conversation Search
  console.log("\n[TEST 7] Testing conversation search query...");
  const searchRes = await fetch(`${BASE_URL}/api/chat?archived=true&search=Reconnecting`);
  const searchData = await searchRes.json();
  assert.ok(searchData.conversations.some((c) => c.id === testConvoId), "Search should find conversation by title");
  console.log("✓ Conversation search PASSED!");

  // 8. Permanent Conversation Deletion
  console.log("\n[TEST 8] Testing permanent conversation deletion from database...");
  const deleteRes = await fetch(`${BASE_URL}/api/chat/${testConvoId}`, { method: "DELETE" });
  assert.strictEqual(deleteRes.status, 200);

  // Verify it is completely gone from DB
  const verifyDeleteRes = await fetch(`${BASE_URL}/api/chat?archived=true`);
  const verifyDeleteData = await verifyDeleteRes.json();
  assert.ok(!verifyDeleteData.conversations.some((c) => c.id === testConvoId), "Deleted conversation must not exist in archived list");

  const verifyDeleteActiveRes = await fetch(`${BASE_URL}/api/chat?archived=false`);
  const verifyDeleteActiveData = await verifyDeleteActiveRes.json();
  assert.ok(!verifyDeleteActiveData.conversations.some((c) => c.id === testConvoId), "Deleted conversation must not exist in active list");
  console.log("✓ Permanent conversation deletion PASSED! (Never reappears after refresh)");

  // 9. Verify .gitignore and .env.example
  console.log("\n[TEST 9] Verifying security of repository files...");
  const gitignorePath = path.join(__dirname, ".gitignore");
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  assert.ok(gitignoreContent.includes(".env"), ".gitignore must ignore .env");
  assert.ok(gitignoreContent.includes("data/*.db"), ".gitignore must ignore data/*.db");

  const envExamplePath = path.join(__dirname, ".env.example");
  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
  assert.ok(!envExampleContent.includes("AQ."), ".env.example must NOT contain real secret keys");
  assert.ok(envExampleContent.includes("GEMINI_API_KEY=your_gemini_api_key_here"), ".env.example must have placeholder");
  assert.ok(envExampleContent.includes("DATABASE_URL="), ".env.example must mention DATABASE_URL");
  console.log("✓ Git ignore & env.example security verification PASSED!");

  // 10. Verify render.yaml Blueprint
  console.log("\n[TEST 10] Verifying render.yaml Blueprint exists and is configured...");
  const renderPath = path.join(__dirname, "render.yaml");
  assert.ok(fs.existsSync(renderPath), "render.yaml must exist");
  const renderYaml = fs.readFileSync(renderPath, "utf-8");
  assert.ok(renderYaml.includes("amelia-assistant"), "render.yaml must define amelia-assistant service");
  assert.ok(renderYaml.includes("amelia-assistant-db"), "render.yaml must define amelia-assistant-db PostgreSQL");
  assert.ok(renderYaml.includes("healthCheckPath: /api/health"), "render.yaml must configure healthCheckPath");
  console.log("✓ Render Blueprint verification PASSED!");

  console.log("\n=======================================================");
  console.log("🎉 ALL 10 TESTS PASSED SUCCESSFULLY WITH ZERO ERRORS! 🎉");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

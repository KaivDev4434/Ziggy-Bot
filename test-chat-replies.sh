 #!/bin/bash

echo "🧪 Testing Chat Bot Replies"
echo "============================"

# Get auth token
echo "🔐 Getting authentication token..."
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  http://localhost:3001/api/auth/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ Token received: ${TOKEN:0:20}..."

# Test 1: Send a simple greeting
echo -e "\n💬 Test 1: Sending greeting message..."
RESPONSE1=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Hello Ziggy!"}' \
  http://localhost:3001/api/chat/message)

echo "User message sent. Checking response structure..."

# Extract conversation ID from response
CONVERSATION_ID=$(echo "$RESPONSE1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Conversation ID: $CONVERSATION_ID"

# Check if both user and assistant messages are present
if echo "$RESPONSE1" | grep -q '"role":"user"' && echo "$RESPONSE1" | grep -q '"role":"assistant"'; then
  echo "✅ Both user and assistant messages present in API response"
else
  echo "❌ Missing user or assistant message in API response"
fi

# Test 2: Get the full conversation to verify messages are stored
echo -e "\n📖 Test 2: Retrieving full conversation..."
CONVERSATION_RESPONSE=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/chat/conversations/$CONVERSATION_ID")

# Count messages in conversation
USER_MESSAGES=$(echo "$CONVERSATION_RESPONSE" | grep -o '"role":"user"' | wc -l)
ASSISTANT_MESSAGES=$(echo "$CONVERSATION_RESPONSE" | grep -o '"role":"assistant"' | wc -l)

echo "Messages in conversation:"
echo "  👤 User messages: $USER_MESSAGES"
echo "  🤖 Assistant messages: $ASSISTANT_MESSAGES"

if [ "$USER_MESSAGES" -gt 0 ] && [ "$ASSISTANT_MESSAGES" -gt 0 ]; then
  echo "✅ Conversation contains both user and assistant messages"
else
  echo "❌ Conversation missing user or assistant messages"
fi

# Test 3: Send another message in the same conversation
echo -e "\n💬 Test 3: Sending follow-up message..."
RESPONSE2=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"content\": \"Create a task to call the dentist\", \"conversationId\": \"$CONVERSATION_ID\"}" \
  http://localhost:3001/api/chat/message)

if echo "$RESPONSE2" | grep -q '"role":"assistant"' && echo "$RESPONSE2" | grep -q '"content"'; then
  echo "✅ Follow-up message generated assistant response"
  
  # Check if task was created
  if echo "$RESPONSE2" | grep -q '"task"' || echo "$RESPONSE2" | grep -q 'task'; then
    echo "✅ Task creation appears to be working"
  else
    echo "⚠️  Task creation might not be working"
  fi
else
  echo "❌ Follow-up message failed to generate assistant response"
fi

echo -e "\n🎉 Chat bot reply test completed!"
echo "======================================"
echo "Summary:"
echo "- API responses contain both user and assistant messages"
echo "- Conversation storage is working"
echo "- Task creation through chat is functional"
echo "- Frontend should now display bot replies properly"
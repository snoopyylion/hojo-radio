# Voxra AI Agent — Integration Contract

The Next.js route `POST /api/ai/chat` authenticates the Clerk user and then calls:

```
POST {PYTHON_AI_BACKEND_URL}/chat
```

Set `PYTHON_AI_BACKEND_URL` in your `.env` / production secrets to activate the agent.
Leave it unset to use the built-in stub reply (UI works without the backend).

---

## Request body (sent by Next.js → your Python server)

```json
{
  "user_id": "user_2abc...",
  "conversation_id": "ai",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! ..." }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `user_id` | string | Clerk user ID of the signed-in user |
| `conversation_id` | string | Always `"ai"` for the Voxra AI thread |
| `messages` | array | Full conversation history, newest last |
| `messages[].role` | `"user"` \| `"assistant"` | Standard chat role |
| `messages[].content` | string | Message text |

---

## Response body (your Python server → Next.js → mobile)

```json
{
  "reply": "Here's what I found...",
  "conversation_id": "ai"
}
```

| Field | Type | Notes |
|---|---|---|
| `reply` | string | The AI agent's text response |
| `conversation_id` | string | Echo back the conversation_id |

Return HTTP 200 for success. Non-200 responses cause the mobile app to show an error.

---

## Python server minimum viable implementation

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ChatRequest(BaseModel):
    user_id: str
    conversation_id: str
    messages: list[dict]

@app.post("/chat")
async def chat(req: ChatRequest):
    # Your agent logic here
    reply = "Hello from the Voxra AI agent!"
    return {"reply": reply, "conversation_id": req.conversation_id}
```

Run on any port and point `PYTHON_AI_BACKEND_URL=http://localhost:8000` (or your deployed URL).

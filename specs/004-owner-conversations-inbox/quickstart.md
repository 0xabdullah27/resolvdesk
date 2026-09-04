# Quickstart: Owner Conversations Inbox & Analytics API

**Feature**: `004-owner-conversations-inbox`  
**Date**: 2026-09-05  

---

## 1. Running Automated Tests

Run the full automated test suite verifying owner conversations:

```bash
cd backend

# Run contract tests
uv run pytest tests/contract/test_owner_conversations_contract.py -v

# Run multi-tenant isolation tests
uv run pytest tests/integration/test_owner_conversations_isolation.py -v

# Run full test suite regression
uv run pytest tests/ -v
```

---

## 2. Interactive Testing via Swagger UI

1. Start the backend server:
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload --port 8000
   ```
2. Open `http://localhost:8000/docs` in your browser.
3. Authenticate using the **Authorize** button (top right) by entering a valid Bearer JWT.
4. Navigate to the **Conversations** section:
   - `GET /api/v1/conversations`: View paginated inbox list.
   - `GET /api/v1/conversations/stats`: View aggregated metrics.
   - `GET /api/v1/conversations/{conversation_id}`: View full message transcript.

---

## 3. Testing with `curl`

### List Conversations
```bash
curl -X GET "http://localhost:8000/api/v1/conversations?limit=10&offset=0" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### Get Overview Analytics
```bash
curl -X GET "http://localhost:8000/api/v1/conversations/stats" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### Get Transcript
```bash
curl -X GET "http://localhost:8000/api/v1/conversations/<CONVERSATION_UUID>" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

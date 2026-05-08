# Fyntwin Invoice Intake

Intelligent ERP Automation Assistant — Accounts Payable Module. Matches supplier invoices against Purchase Orders and creates Purchase Invoices in ERPNext with human approval.

## Architecture

### Backend (FastAPI + Agno Agents)

- **IntakeAgent**: Parses natural language invoice descriptions into structured JSON using RAG (LanceDB + Gemini Embeddings)
- **ValidatorAgent**: Fetches Purchase Orders from ERPNext and compares fields (supplier, items, quantities, rates, totals)
- **ActionAgent**: Decides outcome — HITL confirmation on match, discrepancy report on mismatch, or creates Purchase Invoice after approval
- **Team Coordination**: Agno's coordinate mode orchestrates the 3-agent pipeline deterministically

### Frontend (React + Vite)

- Dark-themed UI with real-time health monitoring
- Invoice input with example prompts
- HITL panel for human review of matches
- Discrepancy reports for mismatches
- Session history with Agno SQLite storage

### Key Features

- **HITL (Human-in-the-Loop)**: Full matches require explicit confirmation before creating Purchase Invoices
- **RAG Knowledge Base**: Gemini embeddings for Indian invoice format conversion (1,25,000 = 125000.0)
- **ERPNext Integration**: REST API client with robust error handling and authentication
- **Conditional Branching**: Match → HITL pause; Mismatch → immediate discrepancy report
- **Session Persistence**: Agno SQLite storage for conversation history

## HITL Flow

1. **Invoice Submission**: User describes invoice in natural language
2. **Parsing**: IntakeAgent extracts supplier, PO reference, items, amounts
3. **Validation**: ValidatorAgent fetches PO from ERPNext and compares all fields
4. **Decision**:
   - **Match**: HITL pause — user reviews comparison table and confirms/cancels
   - **Mismatch**: Immediate discrepancy report with field-by-field differences
5. **Execution**: On confirmation, ActionAgent creates Purchase Invoice in ERPNext

## Setup Guide

### Prerequisites

- Python 3.10+
- Node.js 18+
- ERPNext instance with API access
- Google Gemini API key

### Backend Setup

```bash
# Clone and setup
git clone https://github.com/anisheda3/fyntwin-invoice-intake.git
cd fyntwin-invoice-intake

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your real ERPNext and Gemini credentials

# Run backend
uvicorn backend.main:app --reload --port 8000
```

### Frontend Setup

```bash
# In another terminal
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — backend must be running on port 8000.

### ERPNext Setup

1. Create API Key/Secret in ERPNext
2. Ensure Purchase Orders exist with status "Submitted"
3. Test connectivity via `/api/v1/health` endpoint

## API Endpoints

- `POST /api/v1/run` — Process invoice prompt
- `POST /api/v1/confirm` — Resume HITL session
- `GET /api/v1/health` — Service health + ERPNext status
- `GET /api/v1/history` — Session history

## Configuration

All settings via `.env`:

- `ERPNEXT_BASE_URL` — Your ERPNext instance URL
- `GEMINI_API_KEY` — Google AI Studio API key
- `INTAKE_MODEL` — Gemini model for parsing (default: gemini-2.0-flash)
- `VALIDATOR_MODEL` — Gemini model for validation
- `ACTION_MODEL` — Gemini model for decisions
- `EMBEDDING_MODEL` — For RAG (default: models/text-embedding-004)

## Development

### Testing the Pipeline

```bash
# Test parsing only
curl -X POST http://localhost:8000/api/v1/run \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Invoice from Tech Distributors for Rs 1,25,000 — 25 units SSD at Rs 5,000 each. Against PO-2024-0045."}'

# Check health
curl http://localhost:8000/api/v1/health
```

### Adding New Agents

1. Create `backend/agents/agent_4.py`
2. Add to `team.py` members list
3. Update instructions for coordination

## Deployment

### Docker (Recommended)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Notes

- Use production Gemini models for higher rate limits
- Configure CORS for your domain
- Set up proper logging and monitoring
- Backup Agno SQLite database regularly

## Troubleshooting

### Backend Won't Start

- Check `.env` has all required variables
- Verify ERPNext credentials
- Ensure virtual environment is activated

### Frontend Can't Connect

- Backend running on port 8000?
- CORS settings in `.env` include frontend URL?

### Agents Not Working

- Gemini API key valid?
- Check Agno logs for tool call failures
- Verify ERPNext API permissions

### Common Issues

- **PO not found**: Check PO name format (PO-YYYY-NNNNN)
- **Supplier mismatch**: Case-sensitive comparison
- **Amount calculation**: Ensure qty × rate = amount
- **Embedding model**: Use `models/text-embedding-004` for free tier

## License

MIT License — see LICENSE file for details.

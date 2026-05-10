# Fyntwin Invoice Intake

Intelligent ERP Automation Assistant — Accounts Payable Module. Matches supplier invoices against Purchase Orders and creates Purchase Invoices in ERPNext with human approval.

## Architecture

### Backend (FastAPI + Agno Agents)

- **IntakeAgent**: Parses natural language invoice descriptions into structured JSON
- **ValidatorAgent**: Compares extracted invoice data against real Purchase Order data fetched from ERPNext
- **ActionAgent**: Decides outcome — HITL confirmation on match, discrepancy report on mismatch
- **Team Coordination**: Agno's coordinate mode orchestrates the 3-agent pipeline deterministically

**Note on Tool Calling:** Due to Gemini's recent requirement for thought signatures in function calls (not yet supported by Agno), ERPNext API interactions are handled directly in Python using a synchronous client. The agents focus purely on language tasks (parsing, comparing, deciding), while the workflow layer in `team.py` performs the actual ERPNext reads/writes. This maintains a clean separation of concerns and ensures reliable operation without framework compatibility issues.

### Frontend (React + Vite)

- Dark-themed UI with real-time health monitoring
- Invoice input with example prompts
- HITL panel for human review of matches
- Discrepancy reports for mismatches
- Session history with Agno SQLite storage

### Key Features

- **HITL (Human-in-the-Loop)**: Full matches require explicit confirmation before creating Purchase Invoices
- **Real ERPNext Integration**: REST API client with robust error handling and authentication
- **Conditional Branching**: Match → HITL pause; Mismatch → immediate discrepancy report
- **Session Persistence**: Agno SQLite storage for conversation history

## HITL Flow

1. **Invoice Submission**: User describes invoice in natural language
2. **Parsing**: IntakeAgent extracts supplier, PO reference, items, amounts
3. **Validation**: Backend fetches the real Purchase Order from ERPNext, then ValidatorAgent compares all fields
4. **Decision**:
   - **Match**: HITL pause — user reviews comparison table and confirms/cancels
   - **Mismatch**: Immediate discrepancy report with field-by-field differences
5. **Execution**: On confirmation, backend creates Purchase Invoice in ERPNext

## Demo Video

▶️ **End-to-end walkthrough (including HITL confirmation):**  
[Watch the demo](https://drive.google.com/file/d/191og9iT4OQQnuAL8jIwTMluzlxkbyDEC/view?usp=drive_link)

The demo covers:
- Real-time health check against a live ERPNext instance
- Processing a natural‑language invoice
- Human‑in‑the‑loop side‑by‑side comparison
- Successful Purchase Invoice creation after confirmation
- Cancellation path (when user declines)

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

# Run backend (from project root)
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
- `ERPNEXT_API_KEY` — ERPNext API key
- `ERPNEXT_API_SECRET` — ERPNext API secret
- `GEMINI_API_KEY` — Google AI Studio API key
- `INTAKE_MODEL` — Gemini model for parsing (default: gemini-flash-latest)
- `VALIDATOR_MODEL` — Gemini model for validation
- `ACTION_MODEL` — Gemini model for decisions
- `EMBEDDING_MODEL` — For RAG (default: models/gemini-embedding-001)
- `AGNO_STORAGE_PATH` — Path to SQLite database for sessions
- `ALLOWED_ORIGINS` — CORS allowed origins

## Development

### Testing the Pipeline

```bash
# Test with a matching invoice prompt
curl -X POST http://localhost:8000/api/v1/run \
  -H "Content-Type: application/json" \
  -d '{"prompt": "We received an invoice from supplier Summit Traders Ltd. for Rs 53,200 — 76 units of SKU009: Head at Rs 700 each. They say it is against PUR-ORD-2026-00009."}'

# Check health
curl http://localhost:8000/api/v1/health
```

### Project Structure

```
fyntwin-invoice-intake/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # pydantic-settings, loads .env
│   ├── routes/
│   │   ├── agent.py               # POST /api/v1/run  |  POST /api/v1/confirm
│   │   └── health.py              # GET /api/v1/health  |  GET /api/v1/history
│   ├── agents/
│   │   ├── team.py                # Workflow orchestration + real ERP calls
│   │   ├── agent_1.py             # IntakeAgent (NLP parsing)
│   │   ├── agent_2.py             # ValidatorAgent (comparison)
│   │   └── agent_3.py             # ActionAgent (decision)
│   ├── tools/
│   │   └── erpnext_tools.py       # @tool-decorated ERPNext functions (available for inspection)
│   ├── schemas/
│   │   └── models.py              # Pydantic request/response models
│   └── services/
│       └── erpnext_client.py      # Reusable ERPNext HTTP client (sync + async)
├── frontend/                      # React UI
├── .env.example
├── requirements.txt
└── README.md
```

## Troubleshooting

### Backend Won't Start

- Check `.env` has all required variables
- Verify ERPNext credentials
- Ensure virtual environment is activated

### Frontend Can't Connect

- Backend running on port 8000?
- CORS settings in `.env` include frontend URL?

### Agents Not Working

- Gemini API key valid and has quota?
- If you see "thought_signature" errors, switch to `gemini-flash-latest` model
- If you get 404, the model name may have changed — check Google AI Studio for available models

### Common Issues

- **PO not found**: Ensure PO name in prompt matches exactly (e.g., PUR-ORD-2026-00009)
- **Supplier mismatch**: The comparison is case-insensitive and allows partial matches
- **Amount calculation**: Ensure qty × rate = amount in your prompt

## License

MIT License — see LICENSE file for details.

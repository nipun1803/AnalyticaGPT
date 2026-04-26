# ⚡ InsightForge AI — RAG-Based Data Analysis & Insight Generator

A production-grade, full-stack AI-powered data analysis platform that combines **RAG (Retrieval-Augmented Generation)**, **Machine Learning**, and **Natural Language Processing** to transform raw CSV data into actionable business insights.

![Tech Stack](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)
![Python](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)
![AI](https://img.shields.io/badge/Groq-LLM-FF6B6B?style=flat-square)
![VectorDB](https://img.shields.io/badge/ChromaDB-Vectors-6C5CE7?style=flat-square)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  ┌──────┐ ┌──────────┐ ┌───────┐ ┌──────┐ ┌──────────┐ │
│  │Upload│ │Dashboard │ │Charts │ │ML    │ │RAG Chat  │ │
│  └──┬───┘ └────┬─────┘ └───┬───┘ └──┬───┘ └────┬─────┘ │
└─────┼──────────┼───────────┼────────┼──────────┼────────┘
      │          │           │        │          │
      ▼          ▼           ▼        ▼          ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend (Python)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Data Pipeline │  │ ML Engine    │  │ RAG Pipeline   │ │
│  │ • Parse CSV   │  │ • Regression │  │ • Chunk Data   │ │
│  │ • Impute      │  │ • KMeans     │  │ • Embed (ST)   │ │
│  │ • Encode      │  │ • IsoForest  │  │ • Index (CDB)  │ │
│  │ • Normalize   │  │ • Explain    │  │ • Retrieve     │ │
│  └──────────────┘  └──────────────┘  │ • Generate(LLM)│ │
│                                       └────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │ PDF Reports  │  │ Cache Layer  │                      │
│  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
      │                                        │
      ▼                                        ▼
┌──────────┐                          ┌──────────────┐
│ ChromaDB │ (Persistent Vector Store) │  Groq API   │
└──────────┘                          └──────────────┘
```

---

## 🚀 Features

### Core Features
| Feature | Description |
|---------|-------------|
| 📁 **File Upload & Preview** | Drag-and-drop CSV upload, auto-parse, display first N rows, column types, missing values |
| 🔧 **Data Processing** | Missing value imputation (mean/median/mode/drop), categorical encoding, normalization |
| 📊 **Visualizations** | Interactive Bar, Line, Pie, Radar charts + correlation heatmap via Recharts |
| 🤖 **ML Engine** | Linear Regression, KMeans Clustering (auto-k), Isolation Forest Anomaly Detection |
| 🔍 **RAG Pipeline** | Intelligent chunking, sentence-transformer embeddings, ChromaDB vector search, Groq LLM |
| 🧠 **AI Insights** | Auto-generated key insights, trends, recommendations, risk warnings |

### Advanced Features
| Feature | Description |
|---------|-------------|
| 🔗 **Hybrid Search** | Combines keyword + vector similarity using Reciprocal Rank Fusion (RRF) |
| 💾 **Caching Layer** | Disk-based embedding cache (pickle) to avoid recomputation |
| ⚡ **Streaming Responses** | Token-by-token SSE streaming from Groq LLM |
| 📄 **PDF Report Generator** | Branded PDF reports with charts, stats, AI insights using ReportLab |
| 🔎 **Data Profiling** | Automated quality report: completeness, duplicates, memory, distributions |
| 💬 **Query Memory** | Persistent chat history with context-aware follow-up questions |
| 👤 **Role-based Insights** | Analyst / Manager / CEO perspectives with tailored prompts |
| 💡 **Explainable ML** | Feature importance, prediction explanations, model metrics |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS v4, Recharts |
| Backend | FastAPI, Pydantic v2, Uvicorn |
| ML | Scikit-learn, Pandas, NumPy |
| GenAI | Groq API (Llama 3.1 70B) |
| Embeddings | HuggingFace sentence-transformers (all-MiniLM-L6-v2) |
| Vector DB | ChromaDB (persistent storage) |
| Reports | ReportLab, Matplotlib |

---

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Groq API key](https://console.groq.com/) (free tier available)

### 1. Clone & Setup Backend

```bash
cd AnalyticaGPT/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Generate sample data (optional)
python generate_sample_data.py

# Start backend
python main.py
# → Backend running at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

### 2. Setup Frontend

```bash
cd AnalyticaGPT/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → Frontend running at http://localhost:5173
```

### 3. Open the App
Navigate to **http://localhost:5173** — upload a CSV and start analysing!

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload CSV + process + embed + index |
| `POST` | `/api/query` | RAG-based natural language query |
| `POST` | `/api/query/stream` | SSE streaming RAG query |
| `GET` | `/api/summary` | Dataset statistics & quality report |
| `GET` | `/api/insights` | AI-generated insights (role-based) |
| `POST` | `/api/predict` | Linear regression predictions |
| `POST` | `/api/clusters` | KMeans clustering |
| `POST` | `/api/anomalies` | Isolation Forest anomaly detection |
| `POST` | `/api/report` | Generate PDF report |
| `GET` | `/api/history` | Chat history |
| `GET` | `/api/preview` | Data preview (paginated) |
| `GET` | `/api/columns` | Column names and types |

---

## 🧠 How It Works

### RAG Pipeline
```
CSV Upload → Intelligent Chunking → Embedding (sentence-transformers)
                                          ↓
User Query → Embed Query → Hybrid Search (Vector + Keyword)
                                          ↓
                              Retrieved Context → Groq LLM → Answer
```

1. **Chunking Strategy**: Not just row-wise! Creates global summary, per-column statistics, correlation insights, and batched row chunks for rich context.
2. **Embedding**: Uses `all-MiniLM-L6-v2` (384-dim vectors) — fast, efficient, good quality.
3. **Hybrid Search**: Combines semantic (cosine similarity) + keyword search using **Reciprocal Rank Fusion (RRF)** for better retrieval.
4. **Generation**: Retrieved chunks are passed as context to Groq's Llama 3.1 70B with role-specific system prompts.

### ML Pipeline
```
Raw Data → Preprocessing (impute/encode/scale) → Model Training
                                                       ↓
                                               Metrics + Feature Importance + Explanations
```

- **Regression**: Linear Regression with R², RMSE, MAE metrics and coefficient-based feature importance.
- **Clustering**: KMeans with auto-selection of k via silhouette score optimization.
- **Anomaly Detection**: Isolation Forest with configurable contamination rate.

---

## 📁 Project Structure

```
AnalyticaGPT/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Pydantic settings
│   ├── models.py                  # Request/Response schemas
│   ├── api/
│   │   └── routes.py              # All API endpoints
│   ├── services/
│   │   ├── ml/
│   │   │   ├── preprocessing.py   # Data preprocessing pipeline
│   │   │   └── models.py          # ML engine (regression/cluster/anomaly)
│   │   ├── rag/
│   │   │   ├── embed.py           # Embedding & chunking service
│   │   │   ├── retriever.py       # ChromaDB vector retriever + hybrid search
│   │   │   └── generator.py       # Groq LLM generator + role prompts
│   │   └── report.py              # PDF report generator
│   ├── utils/
│   │   ├── parser.py              # CSV parser & profiling utilities
│   │   └── helpers.py             # Caching, hashing, serialization
│   ├── requirements.txt
│   ├── .env.example
│   └── generate_sample_data.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app with routing
│   │   ├── main.jsx               # Entry point
│   │   ├── index.css              # Global styles + Tailwind
│   │   ├── services/
│   │   │   └── api.js             # API client (axios + SSE)
│   │   └── components/
│   │       ├── Sidebar.jsx        # Navigation sidebar
│   │       ├── Dashboard.jsx      # Overview dashboard
│   │       ├── FileUpload.jsx     # Drag-and-drop uploader
│   │       ├── DataPreview.jsx    # Paginated data table
│   │       ├── Charts.jsx         # Recharts visualizations
│   │       ├── ChatBox.jsx        # RAG chat interface
│   │       ├── MLPanel.jsx        # ML engine controls
│   │       ├── InsightsPanel.jsx  # AI insight generator
│   │       ├── ReportPanel.jsx    # PDF report generator
│   │       ├── Skeleton.jsx       # Loading skeletons
│   │       └── StatusCard.jsx     # Metric cards
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🎨 Design Highlights

- **Dark Mode** with a deep purple/navy color palette
- **Glassmorphism** cards with backdrop blur
- **Micro-animations** — fade-in, shimmer skeletons, pulse effects
- **Responsive layout** — sidebar collapses on mobile
- **Custom scrollbars** and hover transitions throughout

---

## 📝 License

MIT License — feel free to use, modify, and distribute.

"""
InsightForge AI — LLM Generator Service
Interfaces with the Groq API for fast inference, with role-based prompting and streaming.
"""

import json
from typing import AsyncGenerator, Dict, List, Optional
from groq import Groq
from loguru import logger

from config import settings


# ── Role-based system prompts ──────────────────────────────────
ROLE_PROMPTS = {
    "analyst": (
        "You are InsightForge AI, a senior data analyst assistant. "
        "Provide detailed, technical analysis with statistical backing. "
        "Include specific numbers, percentages, and data-driven observations. "
        "Mention methodology and suggest deeper analyses where relevant."
    ),
    "manager": (
        "You are InsightForge AI, a business intelligence advisor for managers. "
        "Focus on actionable insights, KPIs, team performance implications, "
        "and operational efficiency. Use clear language, highlight priorities, "
        "and suggest concrete next steps. Avoid overly technical jargon."
    ),
    "ceo": (
        "You are InsightForge AI, a strategic advisor for C-suite executives. "
        "Provide high-level strategic insights, market implications, risk assessment, "
        "and ROI projections. Be concise, focus on business impact, competitive advantage, "
        "and long-term growth opportunities. Lead with the most critical insight first."
    ),
}


class LLMGenerator:
    """Handles LLM interaction with Groq for RAG-based generation."""

    def __init__(self):
        self._client = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    def generate(
        self,
        query: str,
        context_docs: List[Dict],
        role: str = "analyst",
        chat_history: Optional[List[Dict]] = None,
    ) -> str:
        """Generate a response using retrieved context and role-based prompting."""
        system_prompt = ROLE_PROMPTS.get(role, ROLE_PROMPTS["analyst"])
        context_text = self._format_context(context_docs)

        messages = [{"role": "system", "content": system_prompt}]

        # Add chat history for memory
        if chat_history:
            for item in chat_history[-5:]:  # Last 5 exchanges
                messages.append({"role": "user", "content": item.get("query", "")})
                messages.append({"role": "assistant", "content": item.get("answer", "")})

        user_message = (
            f"Based on the following data context, answer the user's question.\n\n"
            f"--- DATA CONTEXT ---\n{context_text}\n--- END CONTEXT ---\n\n"
            f"Question: {query}\n\n"
            f"Provide a comprehensive, well-structured answer. "
            f"If the context doesn't contain enough information, say so clearly. "
            f"Use bullet points and numbers for clarity where appropriate."
        )
        messages.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=2048,
                top_p=0.9,
            )
            answer = response.choices[0].message.content
            logger.info(f"LLM generated response ({len(answer)} chars) for role={role}")
            return answer
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise RuntimeError(f"LLM generation failed: {str(e)}")

    async def generate_stream(
        self,
        query: str,
        context_docs: List[Dict],
        role: str = "analyst",
        chat_history: Optional[List[Dict]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream LLM response token-by-token for SSE."""
        system_prompt = ROLE_PROMPTS.get(role, ROLE_PROMPTS["analyst"])
        context_text = self._format_context(context_docs)

        messages = [{"role": "system", "content": system_prompt}]

        if chat_history:
            for item in chat_history[-5:]:
                messages.append({"role": "user", "content": item.get("query", "")})
                messages.append({"role": "assistant", "content": item.get("answer", "")})

        user_message = (
            f"Based on the following data context, answer the user's question.\n\n"
            f"--- DATA CONTEXT ---\n{context_text}\n--- END CONTEXT ---\n\n"
            f"Question: {query}\n\n"
            f"Provide a comprehensive, well-structured answer."
        )
        messages.append({"role": "user", "content": user_message})

        try:
            stream = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=2048,
                top_p=0.9,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"LLM streaming failed: {e}")
            yield f"\n\n[Error: {str(e)}]"

    def generate_insights(
        self,
        summary_stats: Dict,
        role: str = "analyst",
    ) -> str:
        """Generate proactive insights from dataset summary statistics."""
        system_prompt = ROLE_PROMPTS.get(role, ROLE_PROMPTS["analyst"])

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Analyze these dataset statistics and provide:\n"
                    f"1. **AI Summary & Key Insights** — Explain the entire dataset in plain English. What stands out?\n"
                    f"2. **Trends & Patterns** — What increasing/decreasing patterns or seasonality do you see?\n"
                    f"3. **Business Recommendations** — What actionable suggestions should be taken?\n"
                    f"4. **Alerts & Anomalies** — What risks, anomalies, or sudden drops/spikes should we watch out for?\n"
                    f"5. **Auto-Generated Questions** — Generate 3-5 important analytical questions the user should ask about this data.\n\n"
                    f"IMPORTANT: For every insight, trend, or recommendation provided, include a **Confidence Score** (e.g., [Confidence: 92%]) based on the statistical strength of the evidence.\n\n"
                    f"Dataset Statistics:\n```json\n{json.dumps(summary_stats, indent=2, default=str)}\n```"
                ),
            },
        ]

        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.4,
                max_tokens=2048,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            return f"Could not generate insights: {str(e)}"

    def generate_chart_insights(
        self,
        summary_stats: Dict,
        role: str = "analyst",
    ) -> Dict[str, str]:
        """Generate specific insights for charts to interleave in the PDF report."""
        system_prompt = ROLE_PROMPTS.get(role, ROLE_PROMPTS["analyst"])
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Analyze these dataset statistics and provide short (2-3 sentence) insights for the following charts:\n"
                    f"1. 'distribution': Insights on numeric distribution (means, std, min/max).\n"
                    f"2. 'skewness': Insights on skewness and kurtosis.\n"
                    f"3. 'categorical': Insights on top categorical values.\n\n"
                    f"Return ONLY a valid JSON object with keys 'distribution', 'skewness', and 'categorical'.\n\n"
                    f"Stats:\n{json.dumps(summary_stats, default=str)[:3000]}"
                ),
            },
        ]
        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Chart insight generation failed: {e}")
            return {"distribution": "", "skewness": "", "categorical": ""}

    @staticmethod
    def _format_context(docs: List[Dict]) -> str:
        """Format retrieved documents into a context string."""
        if not docs:
            return "No relevant context found."
        parts = []
        for i, doc in enumerate(docs, 1):
            meta = doc.get("metadata", {})
            chunk_type = meta.get("type", "unknown")
            score = doc.get("relevance_score", 0)
            parts.append(
                f"[Source {i} | Type: {chunk_type} | Relevance: {score}]\n{doc['text']}"
            )
        return "\n\n".join(parts)

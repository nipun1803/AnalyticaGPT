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
    """Handles LLM interaction with Groq and NVIDIA NIM for RAG-based generation."""

    def __init__(self):
        self._groq_client = None
        self._nvidia_client = None

    def _get_provider_info(self):
        """Determine active client, model, and backup info based on config."""
        provider = (settings.LLM_PROVIDER or "groq").lower().strip()
        
        has_groq = bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("your_groq"))
        has_nvidia = bool(settings.NVIDIA_API_KEY and not settings.NVIDIA_API_KEY.startswith("your_nvidia"))

        if provider == "nvidia" and has_nvidia:
            return self._get_nvidia_client(), settings.NVIDIA_MODEL, "nvidia"
        elif provider == "groq" and has_groq:
            return self._get_groq_client(), settings.GROQ_MODEL, "groq"
        elif has_nvidia:
            return self._get_nvidia_client(), settings.NVIDIA_MODEL, "nvidia"
        elif has_groq:
            return self._get_groq_client(), settings.GROQ_MODEL, "groq"
        else:
            # Default to Groq even if key placeholder is present
            return self._get_groq_client(), settings.GROQ_MODEL, "groq"

    def _get_groq_client(self):
        if self._groq_client is None:
            self._groq_client = Groq(api_key=settings.GROQ_API_KEY)
        return self._groq_client

    def _get_nvidia_client(self):
        if self._nvidia_client is None:
            from openai import OpenAI
            self._nvidia_client = OpenAI(
                base_url=settings.NVIDIA_BASE_URL,
                api_key=settings.NVIDIA_API_KEY,
            )
        return self._nvidia_client

    def _get_fallback_info(self, current_provider: str):
        """Returns secondary client and model if configured, or None."""
        has_groq = bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("your_groq"))
        has_nvidia = bool(settings.NVIDIA_API_KEY and not settings.NVIDIA_API_KEY.startswith("your_nvidia"))

        if current_provider == "nvidia" and has_groq:
            return self._get_groq_client(), settings.GROQ_MODEL, "groq"
        elif current_provider == "groq" and has_nvidia:
            return self._get_nvidia_client(), settings.NVIDIA_MODEL, "nvidia"
        return None, None, None

    def _call_chat_completion(self, messages: List[Dict], temperature: float = 0.3, max_tokens: int = 2048, response_format=None, top_p: float = 0.9):
        """Execute chat completion with automatic fallback between NVIDIA NIM and Groq."""
        client, model, provider = self._get_provider_info()
        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
        }
        if response_format:
            kwargs["response_format"] = response_format

        try:
            return client.chat.completions.create(**kwargs), provider, model
        except Exception as primary_err:
            fallback_client, fallback_model, fallback_provider = self._get_fallback_info(provider)
            if fallback_client:
                logger.warning(f"Primary LLM provider {provider} failed ({primary_err}). Falling back to {fallback_provider}...")
                kwargs["model"] = fallback_model
                return fallback_client.chat.completions.create(**kwargs), fallback_provider, fallback_model
            raise primary_err

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
            f"Use bullet points and numbers for clarity where appropriate.\n\n"
            f"CRITICAL: At the end of your answer, add a '--- DATA LINEAGE ---' section listing the specific column names used from the dataset to derive this answer."
        )
        messages.append({"role": "user", "content": user_message})

        try:
            response, used_provider, used_model = self._call_chat_completion(messages, temperature=0.3, max_tokens=2048)
            answer = response.choices[0].message.content
            logger.info(f"LLM generated response ({len(answer)} chars) using {used_provider}:{used_model} for role={role}")
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
        """Stream LLM response token-by-token for SSE with fallback."""
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
            f"Provide a comprehensive, well-structured answer.\n\n"
            f"CRITICAL: At the end of your answer, add a '--- DATA LINEAGE ---' section listing the specific column names used from the dataset."
        )
        messages.append({"role": "user", "content": user_message})

        client, model, provider_name = self._get_provider_info()
        try:
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=2048,
                top_p=0.9,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.warning(f"LLM streaming failed on {provider_name} ({e}), attempting fallback...")
            fallback_client, fallback_model, fallback_provider = self._get_fallback_info(provider_name)
            if fallback_client:
                try:
                    fallback_stream = fallback_client.chat.completions.create(
                        model=fallback_model,
                        messages=messages,
                        temperature=0.3,
                        max_tokens=2048,
                        top_p=0.9,
                        stream=True,
                    )
                    for chunk in fallback_stream:
                        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                    return
                except Exception as fb_err:
                    logger.error(f"Fallback streaming failed on {fallback_provider}: {fb_err}")
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
            response, used_provider, _ = self._call_chat_completion(messages, temperature=0.4, max_tokens=2048)
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
            response, used_provider, _ = self._call_chat_completion(
                messages,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Chart insight generation failed: {e}")
            return {"distribution": "", "skewness": "", "categorical": ""}

    def generate_schema_suggestions(self, col_info: Dict[str, List[str]], filename: str) -> List[str]:
        """Generate 3 smart suggested questions based on the dataset schema."""
        messages = [
            {"role": "system", "content": "You are a data strategist. Given a file name and its column types, suggest 3 highly relevant business questions."},
            {
                "role": "user",
                "content": (
                    f"File: {filename}\nColumns: {json.dumps(col_info)}\n\n"
                    "Return ONLY a JSON array of 3 strings (questions)."
                )
            }
        ]
        try:
            response, used_provider, _ = self._call_chat_completion(
                messages,
                temperature=0.7,
                response_format={"type": "json_object"},
            )
            res = json.loads(response.choices[0].message.content)
            if isinstance(res, dict):
                 return list(res.values())[0] if res.values() else []
            return res
        except Exception as e:
            logger.error(f"Schema suggestion failed: {e}")
            return ["What are the key trends in this data?", "How do different variables correlate?", "Can you summarize the outliers?"]

    def generate_contextual_insight(
        self,
        analysis_type: str,
        data_payload: Dict,
        dataset_shape: Dict,
        role: str = "analyst",
    ) -> str:
        """Generate a short, context-specific AI insight for a chart/ML result/EDA panel."""
        system_prompt = ROLE_PROMPTS.get(role, ROLE_PROMPTS["analyst"])

        type_hints = {
            "regression": "regression model results (R², RMSE, feature importance)",
            "classification": "classification model results (accuracy, F1, confusion matrix)",
            "clustering": "clustering results (silhouette score, cluster sizes)",
            "anomaly": "anomaly detection results (anomaly count, contamination rate)",
            "forecast": "time-series forecasting results (R², forecast values)",
            "chart_overview": "summary statistics chart (mean, std dev across features)",
            "chart_spread": "feature range chart (min, max, mean)",
            "chart_shape": "distribution shape chart (skewness, kurtosis)",
            "chart_categorical": "categorical distribution chart",
            "eda_numeric": "numeric distribution histogram",
            "eda_categorical": "categorical value frequency chart",
            "correlation": "correlation matrix heatmap",
            "cleaning": "data cleaning operation results",
        }
        context_desc = type_hints.get(analysis_type, f"a '{analysis_type}' analysis")

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"You are looking at {context_desc} from a dataset with {dataset_shape.get('rows', '?')} rows "
                    f"and {dataset_shape.get('columns', '?')} columns.\n\n"
                    f"Analysis data:\n{json.dumps(data_payload, indent=2, default=str)[:2000]}\n\n"
                    f"Provide a concise insight (2-4 sentences) that explains:\n"
                    f"1. What this result means in plain English\n"
                    f"2. One actionable recommendation or something noteworthy\n\n"
                    f"Be specific and reference actual numbers from the data. Do NOT use markdown headers."
                ),
            },
        ]

        try:
            response, used_provider, _ = self._call_chat_completion(messages, temperature=0.3, max_tokens=300)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Contextual insight generation failed: {e}")
            return "Unable to generate insight at this time."

    def _format_context(self, docs: List[Dict]) -> str:
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

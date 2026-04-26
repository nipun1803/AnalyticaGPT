"""
InsightForge AI — Retriever Service
Manages ChromaDB vector store and implements hybrid search (keyword + semantic).
Designed to be interchangeable — swap ChromaDB for Pinecone by replacing this module.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
import numpy as np
from typing import List, Dict, Any, Optional
from loguru import logger

from config import settings


class VectorRetriever:
    """
    Abstracts vector storage and retrieval.
    Currently backed by ChromaDB; designed for easy swap to Pinecone / Weaviate.
    """

    def __init__(self, collection_name: str = "insightforge"):
        self.collection_name = collection_name
        self._client = None
        self._collection = None

    @property
    def client(self):
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIR,
            )
            logger.info(f"ChromaDB client initialised at {settings.CHROMA_PERSIST_DIR}")
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def index_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: np.ndarray,
        dataset_id: str,
    ) -> int:
        """
        Store chunks + embeddings in the vector database.
        Clears previous data for the same dataset_id before indexing.
        """
        # Clear existing data for this dataset
        self._clear_dataset(dataset_id)

        ids = [f"{dataset_id}_{i}" for i in range(len(chunks))]
        texts = [c["text"] for c in chunks]
        metadatas = [{**c["metadata"], "dataset_id": dataset_id} for c in chunks]

        # ChromaDB has a batch limit — chunk the upsert
        batch_size = 100
        for start in range(0, len(ids), batch_size):
            end = min(start + batch_size, len(ids))
            self.collection.add(
                ids=ids[start:end],
                documents=texts[start:end],
                embeddings=embeddings[start:end].tolist(),
                metadatas=metadatas[start:end],
            )

        logger.info(f"Indexed {len(ids)} chunks for dataset '{dataset_id}'")
        return len(ids)

    def semantic_search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        dataset_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Pure vector similarity search."""
        where_filter = {"dataset_id": dataset_id} if dataset_id else None

        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        return self._format_results(results)

    def keyword_search(
        self,
        query: str,
        top_k: int = 5,
        dataset_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Keyword-based search using ChromaDB's document search."""
        where_filter = {"dataset_id": dataset_id} if dataset_id else None

        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        return self._format_results(results)

    def hybrid_search(
        self,
        query: str,
        query_embedding: np.ndarray,
        top_k: int = 5,
        dataset_id: Optional[str] = None,
        semantic_weight: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid search: combine semantic + keyword results.
        Uses reciprocal rank fusion to merge rankings.
        """
        semantic_results = self.semantic_search(query_embedding, top_k * 2, dataset_id)
        keyword_results = self.keyword_search(query, top_k * 2, dataset_id)

        # Reciprocal Rank Fusion
        rrf_scores: Dict[str, float] = {}
        doc_map: Dict[str, Dict] = {}
        k = 60  # RRF constant

        for rank, doc in enumerate(semantic_results):
            doc_id = doc.get("id", doc["text"][:50])
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + semantic_weight / (k + rank + 1)
            doc_map[doc_id] = doc

        for rank, doc in enumerate(keyword_results):
            doc_id = doc.get("id", doc["text"][:50])
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + (1 - semantic_weight) / (k + rank + 1)
            if doc_id not in doc_map:
                doc_map[doc_id] = doc

        # Sort by RRF score and return top-k
        sorted_ids = sorted(rrf_scores, key=rrf_scores.get, reverse=True)[:top_k]
        return [doc_map[doc_id] for doc_id in sorted_ids]

    def _clear_dataset(self, dataset_id: str) -> None:
        """Remove all chunks for a given dataset."""
        try:
            existing = self.collection.get(where={"dataset_id": dataset_id})
            if existing["ids"]:
                self.collection.delete(ids=existing["ids"])
                logger.info(f"Cleared {len(existing['ids'])} existing chunks for '{dataset_id}'")
        except Exception as e:
            logger.warning(f"Could not clear dataset '{dataset_id}': {e}")

    def _format_results(self, raw_results: Dict) -> List[Dict[str, Any]]:
        """Normalise ChromaDB query results into a uniform format."""
        results = []
        if not raw_results or not raw_results.get("documents"):
            return results

        docs = raw_results["documents"][0]
        metas = raw_results["metadatas"][0] if raw_results.get("metadatas") else [{}] * len(docs)
        dists = raw_results["distances"][0] if raw_results.get("distances") else [0] * len(docs)
        ids = raw_results["ids"][0] if raw_results.get("ids") else [f"doc_{i}" for i in range(len(docs))]

        for doc, meta, dist, doc_id in zip(docs, metas, dists, ids):
            results.append({
                "id": doc_id,
                "text": doc,
                "metadata": meta,
                "distance": round(float(dist), 4),
                "relevance_score": round(1 - float(dist), 4),
            })

        return results

    def get_collection_stats(self) -> Dict[str, Any]:
        """Return basic collection statistics."""
        return {
            "collection_name": self.collection_name,
            "total_documents": self.collection.count(),
        }

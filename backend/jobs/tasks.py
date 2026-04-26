from loguru import logger

from utils.parser import parse_csv
from services.ml.preprocessing import DataPreprocessor
from services.rag.embed import EmbeddingService
from services.rag.retriever import VectorRetriever


def index_dataset_task(file_path: str, dataset_id: str, filename: str, impute_strategy: str = "mean", normalize: bool = True, encode_categoricals: bool = True) -> dict:
    """
    Background task: parse → preprocess → chunk → embed → index in Chroma.
    Returns small stats for job status UI.
    """
    df = parse_csv(file_path)

    # Preprocess (for validation + consistency; processed df isn't persisted in MVP)
    try:
        pre = DataPreprocessor()
        _ = pre.fit_transform(df.copy(), impute_strategy=impute_strategy, normalize=normalize, encode_categoricals=encode_categoricals)
    except Exception as e:
        logger.warning(f"Preprocess failed in job: {e}")

    embedding = EmbeddingService()
    retriever = VectorRetriever()

    chunks = embedding.create_chunks(df, filename)
    texts = [c["text"] for c in chunks]
    vectors = embedding.embed_texts(texts, cache_key=dataset_id)
    n = retriever.index_chunks(chunks, vectors, dataset_id)

    return {"dataset_id": dataset_id, "chunks_indexed": n, "rows": df.shape[0], "columns": df.shape[1]}


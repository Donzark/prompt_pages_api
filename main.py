import os
import time
from typing import List, Optional, Dict, Any

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_cohere import CohereEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain


load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
if not GROQ_API_KEY or not COHERE_API_KEY:
    raise RuntimeError("Missing GROQ_API_KEY or COHERE_API_KEY in environment.")

# --- FastAPI app ---
app = FastAPI(title="Prompt Pages API", version="1.0.0")

# --- CORS (relax for dev; tighten for prod) ---
allowed = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed.split(",")] if allowed else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Simple in-memory cache (per URL) ---
CACHE_TTL = 60 * 60 * 24  # 24h
_cache: Dict[str, Dict[str, Any]] = {}  # url -> {"ts": float, "vector": FAISS, "chunks": list[Document], "summary": str}

# --- Helpers ---
def _scrape(url: str, timeout: int = 15) -> str:
    try:
        r = requests.get(url, timeout=timeout, headers={"User-Agent": "PromptPages/1.0"})
        r.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to fetch URL: {type(e).__name__}: {e}")
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "header", "footer", "nav"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    cleaned = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not cleaned:
        raise HTTPException(status_code=422, detail="Page appears empty after cleaning.")
    return cleaned

def _build_vector_store(docs: List[Document]) -> FAISS:
    embeddings = CohereEmbeddings(cohere_api_key=COHERE_API_KEY, model="embed-english-v3.0")
    return FAISS.from_documents(docs, embeddings)

def _chunk(text: str) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return splitter.split_documents([Document(page_content=text)])

def _get_llm() -> ChatGroq:
    return ChatGroq(groq_api_key=GROQ_API_KEY, model_name="llama-3.3-70b-versatile")

def _summarize(chunks: List[Document]) -> str:
    llm = _get_llm()
    prompt = ChatPromptTemplate.from_template(
        "Very breifly summarize the following documentation:\n<context>\n{context}\n</context>"
    )
    chain = create_stuff_documents_chain(llm=llm, prompt=prompt)
    result = chain.invoke({"context": chunks})
    return result if isinstance(result, str) else str(result)

def _ensure_cached(url: str):
    now = time.time()
    entry = _cache.get(url)
    if entry and now - entry["ts"] < CACHE_TTL:
        return
    text = _scrape(url)
    chunks = _chunk(text)
    vector = _build_vector_store(chunks)
    summary = _summarize(chunks)
    _cache[url] = {"ts": now, "vector": vector, "chunks": chunks, "summary": summary}

# --- Schemas ---
class SummaryReq(BaseModel):
    url: str

class SummaryRes(BaseModel):
    url: str
    summary: str

class QAReq(BaseModel):
    url: str
    question: str

class QARes(BaseModel):
    url: str
    question: str
    answer: str
    sources: Optional[List[str]] = None  # raw snippets for transparency

# --- Routes ---
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/summary", response_model=SummaryRes)
def summary(req: SummaryReq):
    _ensure_cached(req.url)
    return SummaryRes(url=req.url, summary=_cache[req.url]["summary"])

@app.post("/qa", response_model=QARes)
def qa(req: QAReq):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    _ensure_cached(req.url)
    vector: FAISS = _cache[req.url]["vector"]
    retriever = vector.as_retriever(search_kwargs={"k": 4})
    llm = _get_llm()
    qa_prompt = ChatPromptTemplate.from_template(
        "Give correct answers to the questions taking from provided context and general knowledge, keep answers short and informative .\n"
        "<context>\n{context}\n</context>\nQuestion: {input}"
    )
    chain = create_stuff_documents_chain(llm=llm, prompt=qa_prompt)
    # Pull docs and run
    docs = retriever.invoke(req.question)
    answer = chain.invoke({"context": docs, "input": req.question})
    src = [d.page_content[:500] for d in docs] if docs else []
    return QARes(url=req.url, question=req.question, answer=answer if isinstance(answer, str) else str(answer), sources=src)




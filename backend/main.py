from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import asyncio
import json
import os
import re
import time
import urllib.request
import urllib.error

# Helper to dynamically load .env files from both backend/ and project root
def reload_env_keys():
    backend_env = os.path.join(os.path.dirname(__file__), '.env')
    root_env = os.path.dirname(os.path.dirname(__file__))
    root_env_path = os.path.join(root_env, '.env')
    if os.path.exists(backend_env):
        load_dotenv(backend_env, override=True)
    if os.path.exists(root_env_path):
        load_dotenv(root_env_path, override=True)
    load_dotenv(override=True)

reload_env_keys()

try:
    import httpx
except ImportError:
    httpx = None

try:
    import chromadb
    chroma_client = chromadb.Client()
    rag_collection = chroma_client.get_or_create_collection(name="workflow_studio_rag")
except Exception as e:
    chroma_client = None
    rag_collection = None

app = FastAPI(title="Workflow Studio Backend")

# Configure CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Node(BaseModel):
    id: str
    type: str
    position: Optional[Dict[str, float]] = None
    data: Optional[Dict[str, Any]] = {}

class Edge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    type: Optional[str] = "default"
    animated: Optional[bool] = False
    markerEnd: Optional[Dict[str, Any]] = None

class PipelineRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class RAGUploadRequest(BaseModel):
    document_id: str
    title: str
    content: str

class RAGSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3

# Text Chunking Helper for RAG
def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    if not text:
        return []
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    chunks = []
    
    for p in paragraphs:
        if len(p) <= chunk_size:
            chunks.append(p)
        else:
            start = 0
            while start < len(p):
                end = min(start + chunk_size, len(p))
                chunks.append(p[start:end])
                start += chunk_size - overlap
                if start >= len(p) - overlap:
                    break
    return chunks if chunks else [text]

in_memory_rag_store: List[Dict[str, Any]] = []

def index_document(doc_id: str, title: str, content: str) -> int:
    global rag_collection, chroma_client, in_memory_rag_store
    chunks = chunk_text(content)
    if not chunks:
        return 0

    # Index into in-memory store for instant fallback search
    for i, c in enumerate(chunks):
        words = set(re.findall(r'\w+', c.lower()))
        in_memory_rag_store.append({
            "id": f"{doc_id}_chunk_{i}",
            "document_id": doc_id,
            "title": title,
            "text": c,
            "words": words
        })

    # Index into ChromaDB if available
    try:
        if rag_collection is None:
            import chromadb
            chroma_client = chromadb.Client()
            rag_collection = chroma_client.get_or_create_collection(name="workflow_studio_rag")

        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"document_id": doc_id, "title": title, "chunk_index": i} for i in range(len(chunks))]
        try:
            rag_collection.upsert(ids=ids, documents=chunks, metadatas=metadatas)
        except Exception:
            rag_collection.add(ids=ids, documents=chunks, metadatas=metadatas)
    except Exception:
        pass

    return len(chunks)

def search_rag(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    global rag_collection, in_memory_rag_store
    retrieved = []

    # 1. Query ChromaDB if available
    if rag_collection is not None:
        try:
            results = rag_collection.query(query_texts=[query], n_results=top_k)
            if results and 'documents' in results and results['documents']:
                docs = results['documents'][0]
                metas = results['metadatas'][0] if 'metadatas' in results and results['metadatas'] else [{}] * len(docs)
                for doc, meta in zip(docs, metas):
                    retrieved.append({
                        "text": doc,
                        "title": meta.get("title", "Untitled Document"),
                        "chunk_index": meta.get("chunk_index", 0)
                    })
                if retrieved:
                    return retrieved
        except Exception:
            pass

    # 2. In-memory similarity fallback
    if in_memory_rag_store:
        query_words = set(re.findall(r'\w+', query.lower()))
        scored = []
        for item in in_memory_rag_store:
            score = len(query_words.intersection(item['words'])) if query_words else 1
            scored.append((score, item))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        top_items = scored[:top_k]
        for score, item in top_items:
            retrieved.append({
                "text": item['text'],
                "title": item['title'],
                "chunk_index": 0
            })

    return retrieved

# Helper function for cycle detection & graph analysis
def analyze_dag(nodes: List[Node], edges: List[Edge]):
    num_nodes = len(nodes)
    num_edges = len(edges)

    adjacency = {node.id: [] for node in nodes}
    in_degree = {node.id: 0 for node in nodes}

    for edge in edges:
        if edge.source in adjacency and edge.target in adjacency:
            adjacency[edge.source].append(edge.target)
            in_degree[edge.target] += 1

    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node.id: WHITE for node in nodes}

    def has_cycle(node_id):
        color[node_id] = GRAY
        for neighbor in adjacency[node_id]:
            if color[neighbor] == GRAY:
                return True
            if color[neighbor] == WHITE and has_cycle(neighbor):
                return True
        color[node_id] = BLACK
        return False

    is_dag = True
    for node in nodes:
        if color[node.id] == WHITE:
            if has_cycle(node.id):
                is_dag = False
                break

    if is_dag:
        for edge in edges:
            if edge.source == edge.target:
                is_dag = False
                break

    return is_dag, adjacency, in_degree

# Helper to extract clean handle name from targetHandle ID
def extract_handle_name(node_id: str, target_handle: Optional[str]) -> str:
    if not target_handle:
        return 'input'

    h = str(target_handle)
    if h.startswith(f"{node_id}-"):
        h = h[len(node_id) + 1:]
    elif h.startswith(f"{node_id}_"):
        h = h[len(node_id) + 1:]

    if h.startswith("var-"):
        h = h[4:]
    elif h.startswith("var_"):
        h = h[4:]

    return h

# Helper to extract scalar value from dictionaries
def clean_value(val: Any) -> Any:
    if isinstance(val, dict):
        if val.get('value') is not None:
            return val['value']
        elif 'passed' in val:
            return val.get('value') if val.get('passed') else val.get('status')
        elif 'records' in val:
            return json.dumps(val['records'])
        elif 'response' in val:
            return json.dumps(val['response'])
        elif 'context' in val:
            return val['context']
        elif 'final_answer' in val:
            return val['final_answer']
    return val

# Real LLM API Call Handler
def call_llm(prompt: str, system_prompt: Optional[str] = None, tools_enabled: bool = False) -> Dict[str, Any]:
    # Dynamic reload of .env file
    reload_env_keys()

    # 1. Validate prompt before making API call
    if not prompt or not str(prompt).strip():
        err_msg = "Prompt Error: User prompt is empty after variable resolution."
        return {"text": f"[LLM ERROR] {err_msg}", "raw": None, "error": err_msg}

    # Load API keys from environment (loaded via python-dotenv from backend/.env)
    openai_key = os.environ.get('OPENAI_API_KEY', '').strip()
    anthropic_key = os.environ.get('ANTHROPIC_API_KEY', '').strip()
    gemini_key = (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY', '')).strip()
    groq_key = os.environ.get('GROQ_API_KEY', '').strip()

    # Dry-run testing flag for automated test suites
    if os.environ.get('MOCK_LLM', '').lower() == 'true':
        mock_resp = f"[TEST MOCK RESPONSE] AI answer to: \"{prompt}\""
        return {"text": mock_resp, "raw": None, "error": None}

    # 2. Validate API key presence
    valid_keys = [k for k in [openai_key, anthropic_key, gemini_key, groq_key] if k and not k.startswith('your_')]
    if not valid_keys:
        err_msg = "API Key Missing: Please configure OPENAI_API_KEY (or ANTHROPIC_API_KEY / GEMINI_API_KEY / GROQ_API_KEY) in backend/.env file."
        return {"text": f"[LLM ERROR] {err_msg}", "raw": None, "error": err_msg}

    full_system = system_prompt or "You are a helpful AI assistant. Give clear and concise answers."

    if tools_enabled:
        full_system += "\n\nYou have access to 2 tools:\n" \
                        "1. api_request(method, url, body): Make a REST API request.\n" \
                        "2. rag_search(query): Search local document vector database.\n" \
                        "If you need to call a tool, respond ONLY with a JSON object: {\"tool\": \"<tool_name>\", \"args\": { ... }}.\n" \
                        "If no tool is needed, answer the prompt directly."

    messages = []
    if full_system:
        messages.append({'role': 'system', 'content': full_system})
    messages.append({'role': 'user', 'content': str(prompt)})

    # OpenAI API Execution
    if openai_key and not openai_key.startswith('your_'):
        try:
            url = 'https://api.openai.com/v1/chat/completions'
            headers = {
                'Authorization': f'Bearer {openai_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'model': os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
                'messages': messages,
                'max_tokens': 300
            }
            if httpx is not None:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code != 200:
                        try:
                            err_json = resp.json()
                            err_detail = err_json.get('error', {}).get('message', resp.text)
                        except Exception:
                            err_detail = resp.text
                        
                        if resp.status_code == 429 or 'quota' in err_detail.lower():
                            err_msg = f"OpenAI Quota Exceeded (429): Your OpenAI account has ran out of API credits. Please check your plan/billing at https://platform.openai.com/account/billing or configure GEMINI_API_KEY / GROQ_API_KEY in backend/.env."
                        elif resp.status_code == 401:
                            err_msg = f"OpenAI Authentication Error (401): Invalid API Key provided in backend/.env."
                        else:
                            err_msg = f"OpenAI API Error ({resp.status_code}): {err_detail}"
                        return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}
                    res_data = resp.json()
                    ans = res_data['choices'][0]['message']['content'].strip()
                    return {"text": ans, "raw": res_data, "error": None}
            else:
                body = json.dumps(payload).encode('utf-8')
                req = urllib.request.Request(url, data=body, headers=headers, method='POST')
                with urllib.request.urlopen(req, timeout=15.0) as resp:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    ans = res_data['choices'][0]['message']['content'].strip()
                    return {"text": ans, "raw": res_data, "error": None}
        except (TimeoutError, urllib.error.URLError) as t_err:
            if isinstance(t_err, urllib.error.URLError) and hasattr(t_err, 'reason') and not isinstance(t_err.reason, TimeoutError):
                err_msg = f"OpenAI Network Error: {str(t_err.reason)}"
                return {"text": f"[LLM ERROR] {err_msg}", "raw": None, "error": err_msg}
            err_msg = "LLM request timed out after 15 seconds."
            return {"text": f"[LLM ERROR] {err_msg}", "raw": None, "error": err_msg}
        except urllib.error.HTTPError as http_err:
            try:
                err_json = json.loads(http_err.read().decode('utf-8'))
                err_detail = err_json.get('error', {}).get('message', str(http_err))
            except Exception:
                err_detail = str(http_err)
            err_msg = f"OpenAI HTTP Error ({http_err.code}): {err_detail}"
            return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}
        except Exception as err:
            err_msg = f"OpenAI Error: {str(err)}"
            return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}

    # Anthropic API Execution
    if anthropic_key and not anthropic_key.startswith('your_'):
        try:
            url = 'https://api.anthropic.com/v1/messages'
            headers = {
                'x-api-key': anthropic_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
            payload = {
                'model': os.environ.get('ANTHROPIC_MODEL', 'claude-3-haiku-20240307'),
                'system': full_system,
                'max_tokens': 300,
                'messages': [{'role': 'user', 'content': str(prompt)}]
            }
            if httpx is not None:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code != 200:
                        try:
                            err_json = resp.json()
                            err_detail = err_json.get('error', {}).get('message', resp.text)
                        except Exception:
                            err_detail = resp.text
                        err_msg = f"Anthropic API Error ({resp.status_code}): {err_detail}"
                        return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}
                    res_data = resp.json()
                    ans = res_data['content'][0]['text'].strip()
                    return {"text": ans, "raw": res_data, "error": None}
        except Exception as err:
            err_msg = f"Anthropic Error: {str(err)}"
            return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}

    # Gemini API Execution with Native Function Calling
    if gemini_key and not gemini_key.startswith('your_'):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
            headers = {'Content-Type': 'application/json'}
            
            payload = {
                'contents': [{'role': 'user', 'parts': [{'text': f"{full_system}\n\n{prompt}"}]}]
            }

            if tools_enabled:
                payload['tools'] = [{
                    'functionDeclarations': [
                        {
                            'name': 'api_request',
                            'description': 'Execute a REST HTTP request (GET, POST, PUT, DELETE) to a remote API endpoint and return response data.',
                            'parameters': {
                                'type': 'OBJECT',
                                'properties': {
                                    'method': {'type': 'STRING', 'description': 'HTTP Method (GET, POST, PUT, DELETE)'},
                                    'url': {'type': 'STRING', 'description': 'Target URL endpoint'},
                                    'body': {'type': 'STRING', 'description': 'Optional HTTP request body text or JSON'}
                                },
                                'required': ['url']
                            }
                        },
                        {
                            'name': 'rag_search',
                            'description': 'Search local document vector database for relevant text context.',
                            'parameters': {
                                'type': 'OBJECT',
                                'properties': {
                                    'query': {'type': 'STRING', 'description': 'Search query text'}
                                },
                                'required': ['query']
                            }
                        }
                    ]
                }]

            if httpx is not None:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code != 200:
                        try:
                            err_json = resp.json()
                            err_detail = err_json.get('error', {}).get('message', resp.text)
                        except Exception:
                            err_detail = resp.text
                        err_msg = f"Gemini API Error ({resp.status_code}): {err_detail}"
                        return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}
                    
                    res_data = resp.json()
                    candidates = res_data.get('candidates', [])
                    if not candidates:
                        return {"text": "No candidates returned by Gemini", "raw": res_data, "error": "No candidates"}
                    
                    parts = candidates[0].get('content', {}).get('parts', [])
                    fn_call = None
                    model_part = None
                    for p in parts:
                        if 'functionCall' in p:
                            fn_call = p['functionCall']
                            model_part = p
                            break
                    
                    if fn_call:
                        call_info = {"tool": fn_call.get('name'), "args": fn_call.get('args', {})}
                        return {
                            "text": json.dumps(call_info),
                            "function_call": fn_call,
                            "model_part": model_part,
                            "raw": res_data,
                            "error": None
                        }
                    else:
                        ans = parts[0].get('text', '').strip() if parts else ""
                        return {"text": ans, "function_call": None, "model_part": None, "raw": res_data, "error": None}
        except Exception as err:
            err_msg = f"Gemini Error: {str(err)}"
            return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}

    # Groq API Execution
    if groq_key and not groq_key.startswith('your_'):
        try:
            url = 'https://api.groq.com/openai/v1/chat/completions'
            headers = {
                'Authorization': f'Bearer {groq_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'model': 'llama-3.1-8b-instant',
                'messages': messages,
                'max_tokens': 300
            }
            if httpx is not None:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code != 200:
                        try:
                            err_json = resp.json()
                            err_detail = err_json.get('error', {}).get('message', resp.text)
                        except Exception:
                            err_detail = resp.text
                        err_msg = f"Groq API Error ({resp.status_code}): {err_detail}"
                        return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}
                    res_data = resp.json()
                    ans = res_data['choices'][0]['message']['content'].strip()
                    return {"text": ans, "raw": res_data, "error": None}
        except Exception as err:
            err_msg = f"Groq Error: {str(err)}"
            return {"text": f"[LLM API ERROR] {err_msg}", "raw": None, "error": err_msg}

    err_msg = "API Key Missing: Please configure OPENAI_API_KEY (or ANTHROPIC_API_KEY / GEMINI_API_KEY / GROQ_API_KEY) in backend/.env file."
    return {"text": f"[LLM ERROR] {err_msg}", "raw": None, "error": err_msg}

# Helper to execute Turn 2 of native Gemini Function Calling
def call_gemini_turn2(prompt: str, system_prompt: Optional[str], model_part: Dict[str, Any], tool_name: str, tool_res: Any) -> Dict[str, Any]:
    gemini_key = (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY', '')).strip()
    if not gemini_key or gemini_key.startswith('your_'):
        return {"text": str(tool_res), "error": None}

    full_system = system_prompt or "You are a helpful AI assistant."
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
    headers = {'Content-Type': 'application/json'}

    tools_decl = [{
        'functionDeclarations': [
            {
                'name': 'api_request',
                'description': 'Execute a REST HTTP request (GET, POST, PUT, DELETE) to a remote API endpoint and return response data.',
                'parameters': {
                    'type': 'OBJECT',
                    'properties': {
                        'method': {'type': 'STRING', 'description': 'HTTP Method (GET, POST, PUT, DELETE)'},
                        'url': {'type': 'STRING', 'description': 'Target URL endpoint'},
                        'body': {'type': 'STRING', 'description': 'Optional HTTP request body text or JSON'}
                    },
                    'required': ['url']
                }
            },
            {
                'name': 'rag_search',
                'description': 'Search local document vector database for relevant text context.',
                'parameters': {
                    'type': 'OBJECT',
                    'properties': {
                        'query': {'type': 'STRING', 'description': 'Search query text'}
                    },
                    'required': ['query']
                }
            }
        ]
    }]

    payload = {
        'contents': [
            {'role': 'user', 'parts': [{'text': f"{full_system}\n\n{prompt}"}]},
            {'role': 'model', 'parts': [model_part]},
            {
                'role': 'user',
                'parts': [
                    {
                        'functionResponse': {
                            'name': tool_name,
                            'response': {
                                'name': tool_name,
                                'content': {'result': str(tool_res)}
                            }
                        }
                    }
                ]
            }
        ],
        'tools': tools_decl
    }

    try:
        if httpx is not None:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    res_data = resp.json()
                    candidates = res_data.get('candidates', [])
                    if candidates:
                        parts = candidates[0].get('content', {}).get('parts', [])
                        if parts and 'text' in parts[0]:
                            return {"text": parts[0]['text'].strip(), "error": None}
    except Exception as e:
        pass

    return {"text": str(tool_res), "error": None}

# REST API Executor for Tool/API Node
async def execute_api_node_request(method: str, url: str, headers: Optional[Dict[str, str]] = None, body: Any = None) -> Any:
    method = (method or 'GET').upper()
    if not url or not url.startswith(('http://', 'https://')):
        url = f"https://{url}" if url else "https://jsonplaceholder.typicode.com/posts/1"

    headers = headers or {}
    
    if httpx is not None:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            try:
                if method == 'GET':
                    resp = await client.get(url, headers=headers)
                elif method == 'POST':
                    if isinstance(body, dict):
                        resp = await client.post(url, headers=headers, json=body)
                    else:
                        resp = await client.post(url, headers=headers, content=str(body) if body else None)
                elif method == 'PUT':
                    resp = await client.put(url, headers=headers, content=str(body) if body else None)
                elif method == 'DELETE':
                    resp = await client.delete(url, headers=headers)
                else:
                    resp = await client.get(url, headers=headers)

                if resp.status_code >= 400:
                    raise Exception(f"HTTP {resp.status_code}: {resp.reason_phrase} at {url}")

                try:
                    return resp.json()
                except Exception:
                    return resp.text
            except httpx.RequestError as req_err:
                raise Exception(f"Network Error connecting to {url}: {str(req_err)}")
            except Exception as err:
                raise Exception(f"{str(err)}")
    else:
        try:
            req_data = None
            if method in ['POST', 'PUT'] and body:
                req_data = json.dumps(body).encode('utf-8') if isinstance(body, dict) else str(body).encode('utf-8')
                headers['Content-Type'] = 'application/json'

            req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                raw_bytes = resp.read().decode('utf-8')
                try:
                    return json.loads(raw_bytes)
                except Exception:
                    return raw_bytes
        except urllib.error.HTTPError as http_err:
            raise Exception(f"HTTP {http_err.code}: {http_err.reason} at {url}")
        except urllib.error.URLError as url_err:
            raise Exception(f"Network Error connecting to {url}: {str(url_err.reason)}")
        except Exception as err:
            raise Exception(f"API Request Error: {str(err)}")

# Tool Dispatcher
async def execute_tool_call(tool_name: str, args: Dict[str, Any]) -> str:
    if tool_name == "api_request":
        method = args.get("method", "GET").upper()
        url = args.get("url", "https://jsonplaceholder.typicode.com/posts/1")
        body = args.get("body", "")
        try:
            res = await execute_api_node_request(method, url, {}, body)
            return json.dumps(res) if isinstance(res, (dict, list)) else str(res)
        except Exception as e:
            return f"API Tool Error: {str(e)}"
    elif tool_name == "rag_search":
        query = args.get("query", "")
        top_k = args.get("top_k", 3)
        results = search_rag(query, top_k)
        if not results:
            return f"No relevant RAG documents found for query: '{query}'"
        formatted = []
        for idx, r in enumerate(results, 1):
            formatted.append(f"[{idx}] (Source: {r['title']}) {r['text']}")
        return "\n\n".join(formatted)
    else:
        return f"Unknown tool: '{tool_name}'"

# Bounded AI Agent Execution Loop (max 3 tool steps)
async def execute_agent_node(goal: str, max_steps: int = 3) -> Dict[str, Any]:
    steps_log = []
    current_context = f"Goal: {goal}"

    for step_num in range(1, max_steps + 1):
        prompt = f"{current_context}\n\nStep {step_num}: Choose a tool (api_request or rag_search) to execute or synthesize the final answer."
        llm_res = call_llm(prompt=prompt, system_prompt="You are an autonomous AI Agent bounded to max 3 steps.", tools_enabled=True)
        llm_text = llm_res.get("text", "")

        tool_call = None
        try:
            match = re.search(r'\{.*"tool"\s*:\s*".*\}', llm_text, re.DOTALL)
            if match:
                tool_call = json.loads(match.group(0))
            elif llm_text.strip().startswith("{") and "tool" in llm_text:
                tool_call = json.loads(llm_text.strip())
        except Exception:
            tool_call = None

        if tool_call and "tool" in tool_call:
            t_name = tool_call["tool"]
            t_args = tool_call.get("args", {})
            t_output = await execute_tool_call(t_name, t_args)

            steps_log.append({
                "step": step_num,
                "action": f"Called tool '{t_name}'",
                "tool_args": t_args,
                "result": t_output
            })
            current_context += f"\n\n[Step {step_num} Tool '{t_name}'] Result: {t_output}"
        else:
            steps_log.append({
                "step": step_num,
                "action": "Final Answer Synthesized",
                "result": llm_text
            })
            return {
                "success": True,
                "goal": goal,
                "final_answer": llm_text,
                "steps": steps_log
            }

    # If loop capped at max_steps, synthesize final output
    final_res = call_llm(prompt=f"{current_context}\n\nProvide the final answer based on above steps.", system_prompt="AI Agent Final Synthesis.")
    final_ans = final_res.get("text", "")
    steps_log.append({
        "step": max_steps + 1,
        "action": f"Reached max steps cap ({max_steps})",
        "result": final_ans
    })

    return {
        "success": True,
        "goal": goal,
        "final_answer": final_ans,
        "steps": steps_log
    }

@app.get('/')
def read_root():
    return {'Ping': 'Pong'}

@app.post('/rag/upload')
def upload_rag_document(payload: RAGUploadRequest):
    chunks_indexed = index_document(payload.document_id, payload.title, payload.content)
    return {
        "success": True,
        "document_id": payload.document_id,
        "title": payload.title,
        "chunks_indexed": chunks_indexed
    }

@app.post('/rag/search')
def search_rag_endpoint(payload: RAGSearchRequest):
    results = search_rag(payload.query, payload.top_k or 3)
    return {
        "success": True,
        "query": payload.query,
        "results": results
    }

@app.post('/pipelines/parse')
def parse_pipeline(request: PipelineRequest):
    num_nodes = len(request.nodes)
    num_edges = len(request.edges)

    is_dag, _, _ = analyze_dag(request.nodes, request.edges)

    return {
        'num_nodes': num_nodes,
        'num_edges': num_edges,
        'is_dag': is_dag
    }

def get_topological_order(nodes: List[Node], edges: List[Edge]):
    in_degree = {node.id: 0 for node in nodes}
    adj = {node.id: [] for node in nodes}

    for edge in edges:
        if edge.source in adj and edge.target in in_degree:
            adj[edge.source].append(edge.target)
            in_degree[edge.target] += 1

    queue = [node_id for node_id, deg in in_degree.items() if deg == 0]
    topological_order = []

    while queue:
        curr = queue.pop(0)
        topological_order.append(curr)

        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return topological_order

# Execute single node behavior
async def execute_single_node(node: Node, inputs: Dict[str, Any]):
    node_type = node.type
    data = node.data or {}

    start_time = time.time()
    result = None
    status = "success"
    error_msg = None

    try:
        if node_type in ['customInput', 'input']:
            val = data.get('value')
            if val is None or val == '':
                val = data.get('inputName', 'Default Input')
            result = val

        elif node_type in ['customOutput', 'output']:
            val = inputs.get('value') or inputs.get('input')
            if val is None and inputs:
                val = list(inputs.values())[0]
            result = clean_value(val) if val is not None else "No Input Received"

        elif node_type in ['text']:
            raw_text = data.get('text', '')
            for var_name, val in inputs.items():
                if val is not None:
                    display_val = str(clean_value(val))
                    escaped_var = re.escape(str(var_name))
                    pattern = re.compile(r'\{\{\s*' + escaped_var + r'\s*\}\}')
                    raw_text = pattern.sub(display_val.replace('\\', '\\\\'), raw_text)
            result = raw_text

        elif node_type in ['llm']:
            system_prompt = inputs.get('system') or data.get('system', '')
            prompt = inputs.get('prompt') or data.get('prompt', '')

            if not prompt and inputs:
                # Fallback to any passed input if prompt empty
                non_system = {k: v for k, v in inputs.items() if k != 'system'}
                if non_system:
                    prompt = str(list(non_system.values())[0])

            # Interpolate variables in prompt
            prompt_str = str(clean_value(prompt))
            for var_name, val in inputs.items():
                if val is not None:
                    display_val = str(clean_value(val))
                    escaped_var = re.escape(str(var_name))
                    pattern = re.compile(r'\{\{\s*' + escaped_var + r'\s*\}\}')
                    prompt_str = pattern.sub(display_val.replace('\\', '\\\\'), prompt_str)

            tools_enabled = data.get('tools_enabled', False)
            llm_res = await asyncio.to_thread(call_llm, prompt_str, str(system_prompt) if system_prompt else None, tools_enabled)

            if llm_res.get('error'):
                status = "error"
                error_msg = llm_res['error']
                result = f"Error: {error_msg}"
            else:
                raw_ans = llm_res['text']

                # Single-step tool calling if tools enabled
                if tools_enabled:
                    fn_call = llm_res.get('function_call')
                    model_part = llm_res.get('model_part')

                    tool_call = None
                    if fn_call:
                        tool_call = {"tool": fn_call.get('name'), "args": fn_call.get('args', {})}
                    else:
                        try:
                            match = re.search(r'\{.*"tool"\s*:\s*".*\}', raw_ans, re.DOTALL)
                            if match:
                                tool_call = json.loads(match.group(0))
                            elif raw_ans.strip().startswith("{") and "tool" in raw_ans:
                                tool_call = json.loads(raw_ans.strip())
                        except Exception:
                            tool_call = None

                    if tool_call and "tool" in tool_call:
                        tool_name = tool_call["tool"]
                        tool_args = tool_call.get("args", {})
                        tool_res = await execute_tool_call(tool_name, tool_args)

                        # Turn 2: Feed tool result back to Gemini natively if model_part exists
                        if model_part and (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')):
                            synth_res = await asyncio.to_thread(
                                call_gemini_turn2, prompt_str, str(system_prompt) if system_prompt else None, model_part, tool_name, tool_res
                            )
                            final_text = synth_res.get('text', str(tool_res))
                        else:
                            synth_prompt = f"{prompt_str}\n\n[Tool Executed '{tool_name}'] Output:\n{tool_res}\n\nSynthesize final answer:"
                            synth_res = await asyncio.to_thread(call_llm, synth_prompt, str(system_prompt) if system_prompt else None, False)
                            final_text = synth_res.get('text', str(tool_res))

                        result = {
                            "tool_called": tool_name,
                            "tool_args": tool_args,
                            "api_response_preview": str(tool_res)[:300],
                            "final_answer": final_text
                        }
                    else:
                        result = {
                            "tool_calling_note": "Tool calling enabled; Gemini generated direct response without calling tools.",
                            "final_answer": raw_ans
                        }
                else:
                    result = raw_ans

        elif node_type in ['api']:
            method = data.get('method', 'GET').upper()
            raw_url = data.get('url', 'https://jsonplaceholder.typicode.com/posts/1')
            raw_body = data.get('body', '')

            # Variable interpolation in URL & Body
            url = raw_url
            body = raw_body
            for var_name, val in inputs.items():
                if val is not None:
                    display_val = str(clean_value(val))
                    escaped_var = re.escape(str(var_name))
                    pattern = re.compile(r'\{\{\s*' + escaped_var + r'\s*\}\}')
                    url = pattern.sub(display_val, url)
                    if isinstance(body, str):
                        body = pattern.sub(display_val.replace('\\', '\\\\'), body)

            try:
                result = await execute_api_node_request(method, url, {}, body)
            except Exception as api_err:
                status = "error"
                error_msg = str(api_err)
                result = {"error": error_msg, "url": url, "method": method}

        elif node_type in ['document']:
            doc_id = node.id
            title = data.get('title', 'Document')
            content = data.get('text', '') or inputs.get('text', '') or inputs.get('input', '')
            content_str = str(clean_value(content))

            chunks_indexed = index_document(doc_id, title, content_str)
            result = {
                "status": "indexed",
                "document_id": doc_id,
                "title": title,
                "chunks_count": chunks_indexed
            }

        elif node_type in ['ragSearch']:
            query = inputs.get('query') or data.get('query', '')
            query_str = str(clean_value(query))

            # Interpolate variables in query
            for var_name, val in inputs.items():
                if val is not None:
                    display_val = str(clean_value(val))
                    escaped_var = re.escape(str(var_name))
                    pattern = re.compile(r'\{\{\s*' + escaped_var + r'\s*\}\}')
                    query_str = pattern.sub(display_val, query_str)

            top_k = int(data.get('top_k', 3))
            retrieved = search_rag(query_str, top_k)
            
            if retrieved:
                formatted_context = "\n\n".join([f"[{i+1}] ({r['title']}): {r['text']}" for i, r in enumerate(retrieved)])
            else:
                formatted_context = f"No relevant RAG document chunks found for query: '{query_str}'"

            result = {
                "context": formatted_context,
                "retrieved_count": len(retrieved),
                "chunks": retrieved
            }

        elif node_type in ['agent']:
            goal = inputs.get('goal') or data.get('goal', 'Synthesize workflow output')
            goal_str = str(clean_value(goal))

            for var_name, val in inputs.items():
                if val is not None:
                    display_val = str(clean_value(val))
                    escaped_var = re.escape(str(var_name))
                    pattern = re.compile(r'\{\{\s*' + escaped_var + r'\s*\}\}')
                    goal_str = pattern.sub(display_val, goal_str)

            max_steps = int(data.get('max_steps', 3))
            agent_res = await execute_agent_node(goal_str, max_steps)
            result = agent_res

        elif node_type in ['math']:
            val = inputs.get('input')
            if val is None and inputs:
                val = list(inputs.values())[0]

            clean_val = clean_value(val)
            try:
                num_val = float(clean_val) if clean_val is not None else 0.0
                operand = float(data.get('operand', 0))
                op = str(data.get('operation', 'add')).lower()

                if op in ['add', '+']:
                    res_num = num_val + operand
                elif op in ['subtract', '-']:
                    res_num = num_val - operand
                elif op in ['multiply', '*']:
                    res_num = num_val * operand
                elif op in ['divide', '/']:
                    if operand == 0:
                        raise Exception("Division by zero error")
                    res_num = num_val / operand
                elif op in ['modulo', '%']:
                    if operand == 0:
                        raise Exception("Modulo by zero error")
                    res_num = num_val % operand
                else:
                    res_num = num_val + operand
                result = res_num
            except Exception as err:
                status = "error"
                error_msg = f"Math Error: {str(err)}"
                result = error_msg

        elif node_type in ['filter']:
            val = inputs.get('input')
            if val is None and inputs:
                val = list(inputs.values())[0]

            clean_val = clean_value(val)
            condition = data.get('condition', 'equals')
            target_val = str(data.get('value', ''))
            str_val = str(clean_val) if clean_val is not None else ''

            passed = False
            if condition == 'equals':
                passed = (str_val == target_val)
            elif condition == 'not_equals':
                passed = (str_val != target_val)
            elif condition == 'contains':
                passed = (target_val.lower() in str_val.lower())
            elif condition == 'greater_than':
                try:
                    passed = (float(str_val) > float(target_val))
                except ValueError:
                    passed = (str_val > target_val)
            elif condition == 'less_than':
                try:
                    passed = (float(str_val) < float(target_val))
                except ValueError:
                    passed = (str_val < target_val)

            result = {
                "passed": passed,
                "value": str_val if passed else None,
                "status": f"Filter '{condition}' on '{target_val}': {'PASSED' if passed else 'FAILED'}"
            }

        elif node_type in ['timer']:
            delay_sec = float(data.get('delay', 1))
            actual_delay = min(max(delay_sec, 0.0), 60.0)
            await asyncio.sleep(actual_delay)

            val = inputs.get('input')
            if val is None and inputs:
                val = list(inputs.values())[0]

            clean_val = clean_value(val)
            result = f"[Delayed {actual_delay}s]: {clean_val if clean_val is not None else 'Completed'}"

        elif node_type in ['database']:
            query = data.get('query', 'SELECT * FROM table')
            conn = data.get('connection', 'default')
            result = {
                "simulated": True,
                "type": "Database Query",
                "connection": conn,
                "query": query,
                "records": [
                    {"id": 101, "name": "Alpha Record", "status": "active"},
                    {"id": 102, "name": "Beta Record", "status": "verified"}
                ]
            }
        else:
            result = inputs if inputs else data.get('text', 'Node Executed')

    except Exception as err:
        status = "error"
        error_msg = str(err)
        result = f"Execution Error: {error_msg}"

    exec_time_ms = round((time.time() - start_time) * 1000, 2)
    return result, status, error_msg, exec_time_ms

@app.post('/pipelines/execute')
async def execute_pipeline(request: PipelineRequest):
    is_dag, adjacency, in_degree = analyze_dag(request.nodes, request.edges)
    if not is_dag:
        return {
            "success": False,
            "error": "Cannot execute a cyclic graph",
            "is_dag": False
        }

    topological_order = get_topological_order(request.nodes, request.edges)
    node_map = {node.id: node for node in request.nodes}

    outputs = {}
    node_execution_logs = {}
    terminal_outputs = {}

    for node_id in topological_order:
        node = node_map[node_id]

        node_inputs = {}
        incoming_edges = [e for e in request.edges if e.target == node_id]

        for edge in incoming_edges:
            source_output = outputs.get(edge.source)
            handle_name = extract_handle_name(node_id, edge.targetHandle)
            node_inputs[handle_name] = source_output

        res_output, status, error_msg, exec_time = await execute_single_node(node, node_inputs)
        outputs[node_id] = res_output

        node_name = node.data.get('title') or node.data.get('inputName') or node.data.get('outputName') or node.id

        node_execution_logs[node_id] = {
            "id": node_id,
            "type": node.type,
            "name": node_name,
            "status": status,
            "error": error_msg,
            "inputs_received": node_inputs,
            "output": res_output,
            "execution_time_ms": exec_time
        }

        if node.type in ['customOutput', 'output']:
            terminal_outputs[node_name] = res_output

    return {
        "success": True,
        "is_dag": True,
        "topological_order": topological_order,
        "node_execution_logs": node_execution_logs,
        "terminal_outputs": terminal_outputs
    }

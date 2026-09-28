# test_main.py
import os
from fastapi.testclient import TestClient

# Set test mock flag for automated pytest runs
os.environ['MOCK_LLM'] = 'true'

from main import app, call_llm

client = TestClient(app)

def test_read_root():
    response = client.get('/')
    assert response.status_code == 200
    assert response.json() == {'Ping': 'Pong'}

def test_parse_pipeline():
    payload = {
        "nodes": [
            {"id": "node-1", "type": "customInput", "position": {"x": 0, "y": 0}, "data": {}},
            {"id": "node-2", "type": "customOutput", "position": {"x": 100, "y": 0}, "data": {}}
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "node-1",
                "target": "node-2",
                "type": "default",
                "animated": True,
                "markerEnd": {"type": "arrow"}
            }
        ]
    }
    response = client.post('/pipelines/parse', json=payload, headers={'Origin': 'http://localhost:3000'})
    assert response.status_code == 200
    data = response.json()
    assert data['num_nodes'] == 2
    assert data['num_edges'] == 1
    assert data['is_dag'] is True

def test_execute_pipeline_basic_llm():
    payload = {
        "nodes": [
            {"id": "input-1", "type": "customInput", "position": {"x": 0, "y": 0}, "data": {"inputName": "lead_details", "value": "Rajdeep, budget $80,000"}},
            {"id": "text-1", "type": "text", "position": {"x": 200, "y": 0}, "data": {"text": "Summarize this lead: {{lead_details}}"}},
            {"id": "llm-1", "type": "llm", "position": {"x": 400, "y": 0}, "data": {"system": "You are a sales assistant"}},
            {"id": "output-1", "type": "customOutput", "position": {"x": 600, "y": 0}, "data": {"outputName": "final_summary"}}
        ],
        "edges": [
            {"id": "e1", "source": "input-1", "target": "text-1", "sourceHandle": "input-1-value", "targetHandle": "text-1-lead_details"},
            {"id": "e2", "source": "text-1", "target": "llm-1", "sourceHandle": "text-1-output", "targetHandle": "llm-1-prompt"},
            {"id": "e3", "source": "llm-1", "target": "output-1", "sourceHandle": "llm-1-response", "targetHandle": "output-1-value"}
        ]
    }

    response = client.post('/pipelines/execute', json=payload, headers={'Origin': 'http://localhost:3000'})
    assert response.status_code == 200
    data = response.json()

    assert data['success'] is True
    assert data['is_dag'] is True
    assert "input-1" in data['node_execution_logs']
    assert data['node_execution_logs']['llm-1']['status'] == "success"

def test_execute_pipeline_api_node():
    payload = {
        "nodes": [
            {"id": "api-1", "type": "api", "position": {"x": 0, "y": 0}, "data": {"method": "GET", "url": "https://jsonplaceholder.typicode.com/posts/1"}},
            {"id": "output-1", "type": "customOutput", "position": {"x": 200, "y": 0}, "data": {"outputName": "api_result"}}
        ],
        "edges": [
            {"id": "e1", "source": "api-1", "target": "output-1", "sourceHandle": "api-1-response", "targetHandle": "output-1-value"}
        ]
    }

    response = client.post('/pipelines/execute', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert data['node_execution_logs']['api-1']['status'] == "success"

def test_rag_upload_and_search_nodes():
    # 1. Test RAG Upload Endpoint
    upload_payload = {
        "document_id": "doc_test_1",
        "title": "Workflow Studio Guide",
        "content": "Workflow Studio is an advanced visual graph editor for building AI pipelines. It supports LLM tool calling, local ChromaDB RAG, and AI agent execution."
    }
    upload_res = client.post('/rag/upload', json=upload_payload)
    assert upload_res.status_code == 200
    assert upload_res.json()['success'] is True

    # 2. Test RAG Search Endpoint
    search_payload = {
        "query": "What is Workflow Studio?",
        "top_k": 2
    }
    search_res = client.post('/rag/search', json=search_payload)
    assert search_res.status_code == 200
    assert search_res.json()['success'] is True

    # 3. Test Pipeline Graph Execution with Document + RAG Search + Output
    pipeline_payload = {
        "nodes": [
            {"id": "doc-1", "type": "document", "position": {"x": 0, "y": 0}, "data": {"title": "Company Policy", "text": "Refund policy guarantees 30-day money back for software subscriptions."}},
            {"id": "rag-1", "type": "ragSearch", "position": {"x": 200, "y": 0}, "data": {"query": "What is the refund policy?", "top_k": 1}},
            {"id": "out-1", "type": "customOutput", "position": {"x": 400, "y": 0}, "data": {"outputName": "retrieved_policy"}}
        ],
        "edges": [
            {"id": "e1", "source": "doc-1", "target": "rag-1"},
            {"id": "e2", "source": "rag-1", "target": "out-1"}
        ]
    }
    exec_res = client.post('/pipelines/execute', json=pipeline_payload)
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data['success'] is True
    assert exec_data['node_execution_logs']['rag-1']['status'] == "success"

def test_agent_node_execution():
    payload = {
        "nodes": [
            {"id": "agent-1", "type": "agent", "position": {"x": 0, "y": 0}, "data": {"goal": "Fetch data from API and summarize", "max_steps": 2}},
            {"id": "out-1", "type": "customOutput", "position": {"x": 200, "y": 0}, "data": {"outputName": "agent_result"}}
        ],
        "edges": [
            {"id": "e1", "source": "agent-1", "target": "out-1"}
        ]
    }
    response = client.post('/pipelines/execute', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert data['node_execution_logs']['agent-1']['status'] == "success"
    assert "steps" in data['node_execution_logs']['agent-1']['output']

def test_execute_pipeline_cycle_rejection():
    payload = {
        "nodes": [
            {"id": "n1", "type": "customInput", "position": {"x": 0, "y": 0}, "data": {}},
            {"id": "n2", "type": "customOutput", "position": {"x": 100, "y": 0}, "data": {}}
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "n1"}
        ]
    }
    response = client.post('/pipelines/execute', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is False
    assert data['error'] == "Cannot execute a cyclic graph"

def test_llm_error_handling():
    # 1. Test Empty Prompt Error
    empty_res = call_llm(prompt="")
    assert "Prompt Error" in empty_res['text']
    assert empty_res['error'] is not None

    # 2. Test Missing API Key Error (when MOCK_LLM is disabled and keys cleared)
    old_mock = os.environ.get('MOCK_LLM')
    old_key = os.environ.get('OPENAI_API_KEY')
    old_gemini = os.environ.get('GEMINI_API_KEY')
    backend_env = os.path.join(os.path.dirname(__file__), '.env')
    root_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    bak_backend = backend_env + '.bak'
    bak_root = root_env + '.bak'
    try:
        os.environ['MOCK_LLM'] = 'false'
        os.environ['OPENAI_API_KEY'] = ''
        os.environ['GEMINI_API_KEY'] = ''
        os.environ['GOOGLE_API_KEY'] = ''
        os.environ['ANTHROPIC_API_KEY'] = ''
        os.environ['GROQ_API_KEY'] = ''
        if os.path.exists(backend_env): os.rename(backend_env, bak_backend)
        if os.path.exists(root_env): os.rename(root_env, bak_root)
        missing_key_res = call_llm(prompt="Hello")
        assert "API Key Missing" in missing_key_res['text']
        assert missing_key_res['error'] is not None
    finally:
        if os.path.exists(bak_backend):
            if os.path.exists(backend_env): os.remove(backend_env)
            os.rename(bak_backend, backend_env)
        if os.path.exists(bak_root):
            if os.path.exists(root_env): os.remove(root_env)
            os.rename(bak_root, root_env)
        if old_mock: os.environ['MOCK_LLM'] = old_mock
        if old_key: os.environ['OPENAI_API_KEY'] = old_key
        if old_gemini: os.environ['GEMINI_API_KEY'] = old_gemini

def test_gemini_tool_calling_live():
    old_mock = os.environ.get('MOCK_LLM')
    try:
        os.environ['MOCK_LLM'] = 'false'
        payload = {
            "nodes": [
                {
                    "id": "agent-1",
                    "type": "agent",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "goal": "Fetch post 1 from JSONPlaceholder API using api_request tool and summarize it.",
                        "max_steps": 3
                    }
                }
            ],
            "edges": []
        }
        response = client.post('/pipelines/execute', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        log = data['node_execution_logs']['agent-1']
        assert log['status'] == "success"
        output = log['output']
        assert "steps" in output
        steps = output['steps']
        assert len(steps) >= 1
        tool_steps = [s for s in steps if "tool" in s.get("action", "").lower()]
        assert len(tool_steps) >= 1
        assert "api_request" in tool_steps[0]['action']
        assert tool_steps[0]['result'] is not None
        assert output['final_answer'] is not None
    finally:
        if old_mock:
            os.environ['MOCK_LLM'] = old_mock

if __name__ == '__main__':
    test_read_root()
    test_parse_pipeline()
    test_execute_pipeline_basic_llm()
    test_execute_pipeline_api_node()
    test_rag_upload_and_search_nodes()
    test_agent_node_execution()
    test_execute_pipeline_cycle_rejection()
    test_llm_error_handling()
    test_gemini_tool_calling_live()
    print("All backend tests passed successfully!")

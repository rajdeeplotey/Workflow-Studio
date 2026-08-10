# test_main.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get('/')
    assert response.status_code == 200
    assert response.json() == {'Ping': 'Pong'}

def test_cors_preflight_localhost():
    headers = {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    }
    response = client.options('/pipelines/parse', headers=headers)
    assert response.status_code == 200
    assert response.headers.get('access-control-allow-origin') == 'http://localhost:3000'

def test_cors_preflight_127_0_0_1():
    headers = {
        'Origin': 'http://127.0.0.1:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    }
    response = client.options('/pipelines/parse', headers=headers)
    assert response.status_code == 200
    assert response.headers.get('access-control-allow-origin') == 'http://127.0.0.1:3000'

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

def test_execute_pipeline_success():
    payload = {
        "nodes": [
            {"id": "input-1", "type": "customInput", "position": {"x": 0, "y": 0}, "data": {"inputName": "lead_details", "value": "Rajdeep, budget $80,000, needs a CRM"}},
            {"id": "text-1", "type": "text", "position": {"x": 200, "y": 0}, "data": {"text": "Summarize this lead: {{lead_details}}"}},
            {"id": "llm-1", "type": "llm", "position": {"x": 400, "y": 0}, "data": {}},
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
    assert data['topological_order'] == ["input-1", "text-1", "llm-1", "output-1"]
    
    # Check variable substitution in text node
    text_log = data['node_execution_logs']['text-1']
    assert "Rajdeep, budget $80,000" in text_log['output']

    # Check LLM output (real or mock response)
    llm_log = data['node_execution_logs']['llm-1']
    assert "MOCK LLM RESPONSE" in llm_log['output'] or len(llm_log['output']) > 0

    # Check Terminal Output
    assert "final_summary" in data['terminal_outputs']

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
    response = client.post('/pipelines/execute', json=payload, headers={'Origin': 'http://localhost:3000'})
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is False
    assert data['error'] == "Cannot execute a cyclic graph"

def test_execute_math_filter_timer_nodes():
    payload = {
        "nodes": [
            {"id": "in-1", "type": "customInput", "position": {"x": 0, "y": 0}, "data": {"value": "10"}},
            {"id": "math-1", "type": "math", "position": {"x": 200, "y": 0}, "data": {"operation": "add", "operand": 5}},
            {"id": "filter-1", "type": "filter", "position": {"x": 400, "y": 0}, "data": {"condition": "greater_than", "value": "10"}},
            {"id": "timer-1", "type": "timer", "position": {"x": 600, "y": 0}, "data": {"delay": 0.1}},
            {"id": "out-1", "type": "customOutput", "position": {"x": 800, "y": 0}, "data": {"outputName": "result"}}
        ],
        "edges": [
            {"id": "e1", "source": "in-1", "target": "math-1", "targetHandle": "math-1-input"},
            {"id": "e2", "source": "math-1", "target": "filter-1", "targetHandle": "filter-1-input"},
            {"id": "e3", "source": "filter-1", "target": "timer-1", "targetHandle": "timer-1-input"},
            {"id": "e4", "source": "timer-1", "target": "out-1", "targetHandle": "out-1-value"}
        ]
    }

    response = client.post('/pipelines/execute', json=payload, headers={'Origin': 'http://localhost:3000'})
    assert response.status_code == 200
    data = response.json()

    assert data['success'] is True
    assert data['node_execution_logs']['math-1']['output'] == 15.0
    assert data['node_execution_logs']['filter-1']['output']['passed'] is True

if __name__ == '__main__':
    test_read_root()
    test_cors_preflight_localhost()
    test_cors_preflight_127_0_0_1()
    test_parse_pipeline()
    test_execute_pipeline_success()
    test_execute_pipeline_cycle_rejection()
    test_execute_math_filter_timer_nodes()
    print("All backend tests (parse & execute) passed successfully!")

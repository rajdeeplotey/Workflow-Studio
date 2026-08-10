from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
import os
import re
import time
import urllib.request
import urllib.error

app = FastAPI()

# Configure CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=False,  # Must be False when using wildcard origins
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

    # Cycle detection using DFS (White/Gray/Black)
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

    # Self-loops check
    if is_dag:
        for edge in edges:
            if edge.source == edge.target:
                is_dag = False
                break

    return is_dag, adjacency, in_degree

# Helper to extract clean variable/handle name from targetHandle ID
def extract_handle_name(node_id: str, target_handle: Optional[str]) -> str:
    if not target_handle:
        return 'input'

    h = str(target_handle)
    # Strip node_id prefix if present (e.g. 'llm-1-prompt' -> 'prompt')
    if h.startswith(f"{node_id}-"):
        h = h[len(node_id) + 1:]
    elif h.startswith(f"{node_id}_"):
        h = h[len(node_id) + 1:]

    # Strip 'var-' prefix if present from text node handles (e.g. 'var-lead_details' -> 'lead_details')
    if h.startswith("var-"):
        h = h[4:]
    elif h.startswith("var_"):
        h = h[4:]

    return h

# Helper to extract scalar value from dictionaries (Filter outputs, DB records, API responses)
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
    return val

@app.get('/')
def read_root():
    return {'Ping': 'Pong'}

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

# Helper to compute Topological Order (Kahn's Algorithm)
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

# Real/Mock LLM Call Handler
def call_llm(prompt: str) -> str:
    openai_key = os.environ.get('OPENAI_API_KEY')
    anthropic_key = os.environ.get('ANTHROPIC_API_KEY')

    if openai_key:
        try:
            url = 'https://api.openai.com/v1/chat/completions'
            headers = {
                'Authorization': f'Bearer {openai_key}',
                'Content-Type': 'application/json'
            }
            body = json.dumps({
                'model': 'gpt-3.5-turbo',
                'messages': [{'role': 'user', 'content': str(prompt)}],
                'max_tokens': 150
            }).encode('utf-8')

            req = urllib.request.Request(url, data=body, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                return res_data['choices'][0]['message']['content'].strip()
        except Exception as err:
            return f"[MOCK LLM RESPONSE (OpenAI API Error: {str(err)})] AI answer to prompt: \"{prompt}\""
    elif anthropic_key:
        try:
            url = 'https://api.anthropic.com/v1/messages'
            headers = {
                'x-api-key': anthropic_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
            body = json.dumps({
                'model': 'claude-3-haiku-20240307',
                'max_tokens': 150,
                'messages': [{'role': 'user', 'content': str(prompt)}]
            }).encode('utf-8')

            req = urllib.request.Request(url, data=body, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                return res_data['content'][0]['text'].strip()
        except Exception as err:
            return f"[MOCK LLM RESPONSE (Anthropic API Error: {str(err)})] AI answer to prompt: \"{prompt}\""
    else:
        # Graceful Fallback Mock Response when no API key is provided
        return f"[MOCK LLM RESPONSE] This is the AI answer synthesized for prompt: \"{prompt}\""

# Execute individual node behavior
async def execute_single_node(node: Node, inputs: Dict[str, Any]):
    node_type = node.type
    data = node.data or {}

    start_time = time.time()
    result = None

    if node_type in ['customInput', 'input']:
        # Return runtime value, or inputName, or default
        val = data.get('value')
        if val is None or val == '':
            val = data.get('inputName', 'Default Input')
        result = val

    elif node_type in ['customOutput', 'output']:
        # Terminal node: returns value received on input handle
        val = inputs.get('value') or inputs.get('input')
        if val is None and inputs:
            val = list(inputs.values())[0]

        result = clean_value(val) if val is not None else "No Input Received"

    elif node_type in ['text']:
        raw_text = data.get('text', '')

        # Replace {{var}} placeholders with values from inputs dictionary
        for var_name, val in inputs.items():
            if val is not None:
                display_val = str(clean_value(val))
                escaped_var = re.escape(str(var_name))
                pattern = re.compile(r'\{\{\s*' + escaped_var + r'\s*\}\}')
                raw_text = pattern.sub(display_val.replace('\\', '\\\\'), raw_text)

        result = raw_text

    elif node_type in ['llm']:
        prompt = inputs.get('prompt') or inputs.get('system') or data.get('prompt', '')
        if not prompt and inputs:
            prompt = str(list(inputs.values())[0])

        prompt_str = str(clean_value(prompt))
        result = await asyncio.to_thread(call_llm, prompt_str)

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
                res_num = num_val / operand if operand != 0 else 'Error: Division by Zero'
            elif op in ['modulo', '%']:
                res_num = num_val % operand if operand != 0 else 'Error: Modulo by Zero'
            else:
                res_num = num_val + operand
            result = res_num
        except Exception:
            result = f"Math Error: Could not compute '{clean_val}' with operand '{data.get('operand')}'"

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
        # Allow user delay up to 60 seconds max (prevents infinite HTTP hangs)
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

    elif node_type in ['api']:
        method = data.get('method', 'GET')
        url = data.get('url', 'https://api.example.com')
        result = {
            "simulated": True,
            "type": "API Request",
            "method": method,
            "url": url,
            "statusCode": 200,
            "response": {"message": f"Simulated {method} response from {url}", "success": True}
        }

    else:
        # Fallback generic node
        result = inputs if inputs else data.get('text', 'Node Executed')

    exec_time_ms = round((time.time() - start_time) * 1000, 2)
    return result, exec_time_ms

@app.post('/pipelines/execute')
async def execute_pipeline(request: PipelineRequest):
    # Step 1: Validate DAG
    is_dag, adjacency, in_degree = analyze_dag(request.nodes, request.edges)
    if not is_dag:
        return {
            "success": False,
            "error": "Cannot execute a cyclic graph",
            "is_dag": False
        }

    # Step 2: Compute Topological Execution Order
    topological_order = get_topological_order(request.nodes, request.edges)
    node_map = {node.id: node for node in request.nodes}

    # Maps node_id -> output value of node
    outputs = {}
    node_execution_logs = {}
    terminal_outputs = {}

    # Step 3: Execute in Topological Order
    for node_id in topological_order:
        node = node_map[node_id]

        # Gather inputs coming into this node from upstream connected edges
        node_inputs = {}
        incoming_edges = [e for e in request.edges if e.target == node_id]

        for edge in incoming_edges:
            source_output = outputs.get(edge.source)
            handle_name = extract_handle_name(node_id, edge.targetHandle)
            node_inputs[handle_name] = source_output

        # Execute single node
        res_output, exec_time = await execute_single_node(node, node_inputs)
        outputs[node_id] = res_output

        node_name = node.data.get('inputName') or node.data.get('outputName') or node.id

        node_execution_logs[node_id] = {
            "id": node_id,
            "type": node.type,
            "name": node_name,
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

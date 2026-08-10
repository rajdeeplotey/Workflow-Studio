# Pipeline Builder - Frontend Technical Assessment

A drag-and-drop pipeline builder built with React, React Flow, and FastAPI. Users can create node-based pipelines, connect them with edges, and submit the graph to a backend for cycle detection and analysis.

## Architecture

### Frontend Abstraction

The core architectural decision is the **BaseNode abstraction** - a single reusable component that renders all node types through configuration rather than duplicated JSX.

#### Why This Matters

The starter code had 4 node types with significant duplication:
- Each node contained its own JSX for box/label/handles
- Field management was inconsistent (some used local useState, some had no state)
- Styling was inline and inconsistent
- Adding new nodes required copying/pasting large blocks of code

#### BaseNode Design

`BaseNode.js` accepts a configuration object:

```javascript
{
  title: 'Node Name',
  icon: '🔧',
  accent: '#color',
  width: 220,
  minHeight: 100,
  fields: [
    {
      name: 'fieldName',
      label: 'Field Label',
      type: 'text' | 'number' | 'select' | 'textarea',
      defaultValue: value | (id) => computedValue,
      options: [{ value, label }], // for select
      placeholder: 'placeholder text'
    }
  ],
  handles: [
    {
      id: 'handle-id',
      type: 'source' | 'target',
      position: 'left' | 'right' | 'top' | 'bottom',
      top: 33 // optional - auto-spaced if omitted
    }
  ],
  onFieldChange: (fieldName, value) => {} // optional callback
}
```

#### Key Benefits

1. **True Abstraction**: Node files are now thin config objects (~20 lines each)
2. **Consistent State Management**: All fields read/write to Zustand store
3. **Automatic Handle Spacing**: Handles on the same side are evenly spaced without manual math
4. **Visual Consistency**: Single CSS file (`BaseNode.css`) for all nodes
5. **Extensibility**: Adding new node types takes minutes, not hours

### State Management

Zustand store (`store.js`) manages:
- `nodes`: Array of React Flow nodes
- `edges`: Array of React Flow edges  
- `nodeIDs`: Counter for generating unique node IDs
- `updateNodeField`: Centralized field update function

### Backend Architecture

FastAPI backend (`main.py`) with:
- **Pydantic models** for type-safe request/response handling
- **CORS middleware** configured for React dev server (localhost:3000)
- **DFS cycle detection** using white/gray/black coloring algorithm
- **Edge case handling**: empty graphs, single nodes, self-loops, disconnected components

## Running the Application

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the FastAPI server:
```bash
python -m uvicorn main:app --reload --port 8000
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Available Node Types

### Original Nodes (Refactored)
- **Input** (📥): Entry point for data with name and type fields
- **Output** (📤): Exit point for data with name and type fields  
- **LLM** (🤖): Language model node with system/prompt inputs and response output
- **Text** (📝): Text template node with variable detection (enhanced)

### New Nodes (Added)
- **Math** (🔢): Mathematical operations (add, subtract, multiply, divide, modulo)
- **Filter** (🔍): Conditional filtering with pass/fail outputs
- **Timer** (⏱️): Delay node with configurable time in seconds
- **API Request** (🌐): HTTP request node with method and URL configuration
- **Database** (🗄️): SQL query node with connection management

## Special Features

### Text Node Enhancements

The Text node includes two advanced features:

1. **Auto-resize**: The node dynamically adjusts its width and height based on text content, growing to fit the entered text rather than using fixed dimensions.

2. **Variable Detection**: Parses text for `{{ variableName }}` patterns using regex. For each unique variable found, a new target handle is automatically created on the left side of the node, labeled with the variable name. Handles update in real-time as variables are added/removed/renamed.

### Cycle Detection

The backend implements robust cycle detection:

- **Algorithm**: DFS with white/gray/black coloring (standard graph theory approach)
- **Edge Cases Handled**:
  - Empty graph (0 nodes) → `is_dag: true`
  - Single node, no edges → `is_dag: true`
  - Self-loop (node connected to itself) → `is_dag: false`
  - Disconnected components → still valid DAG if no individual component has a cycle
  - Multi-node cycles → correctly detected as `is_dag: false`

### Error Handling

The frontend includes comprehensive error handling:

- **Network failures**: Clear message if backend is unreachable
- **HTTP errors**: Status code and reason displayed to user
- **User-friendly messages**: Plain language alerts, not raw JSON dumps
- **Console logging**: Detailed errors logged for debugging

## Design Decisions

### Why BaseNode Over Higher-Order Components?

While HOCs or render props could work, the config object approach was chosen because:
- **Declarative**: Node definitions read like data, not code
- **Type-safe**: Easier to add TypeScript validation if needed
- **Predictable**: No complex component composition to reason about
- **Debuggable**: Configuration is inspectable at runtime

### Why Local State in Text Node?

The Text node uses local state for the text field to enable real-time variable detection and auto-resize, but syncs with the global store on every change. This hybrid approach provides:
- **Immediate feedback**: Variable handles update as you type
- **Performance**: No store re-renders on every keystroke
- **Consistency**: Final value always reaches global state

### Why DFS for Cycle Detection?

DFS with coloring is the standard algorithm for cycle detection because:
- **Time complexity**: O(V + E) - optimal for this use case
- **Space complexity**: O(V) - manageable for typical pipeline sizes
- **Correctness**: Proven algorithm, handles all edge cases
- **Clarity**: Easy to understand and maintain

### Why Pydantic Models?

Using Pydantic for request validation provides:
- **Type safety**: Catches type errors before they reach business logic
- **Documentation**: Auto-generated OpenAPI docs
- **Validation**: Automatic schema validation
- **IDE support**: Better autocomplete and type hints

## Testing the Application

### Manual Test Cases

1. **Empty Pipeline**: Submit with no nodes → should return `num_nodes: 0, num_edges: 0, is_dag: true`

2. **Single Node**: Add one node, no edges → should return `num_nodes: 1, num_edges: 0, is_dag: true`

3. **Valid DAG**: Create a linear chain (Input → LLM → Output) → should return `is_dag: true`

4. **Self-Loop**: Connect a node's output to its own input → should return `is_dag: false`

5. **Cycle**: Create a cycle (A → B → C → A) → should return `is_dag: false`

6. **Backend Down**: Stop the backend server and click submit → should show user-friendly error message

7. **Text Variables**: Type "{{foo}} {{bar}}" in Text node → should create two target handles labeled "foo" and "bar"

8. **Node Creation**: Drag each node type to canvas → should render with correct styling and fields

## File Structure

```
frontend/
├── src/
│   ├── nodes/
│   │   ├── BaseNode.js       # Shared node component
│   │   ├── BaseNode.css      # Unified styling
│   │   ├── inputNode.js      # Input node config
│   │   ├── outputNode.js     # Output node config
│   │   ├── llmNode.js        # LLM node config
│   │   ├── textNode.js       # Text node (with enhancements)
│   │   ├── mathNode.js       # Math node config
│   │   ├── filterNode.js     # Filter node config
│   │   ├── timerNode.js      # Timer node config
│   │   ├── apiNode.js        # API node config
│   │   └── databaseNode.js   # Database node config
│   ├── store.js              # Zustand state management
│   ├── ui.js                 # React Flow canvas
│   ├── toolbar.js            # Draggable node toolbar
│   ├── submit.js             # Submit button with API call
│   ├── draggableNode.js      # Draggable node component
│   └── App.js                # Main app component
backend/
├── main.py                   # FastAPI application
└── requirements.txt          # Python dependencies
```

## Future Improvements

Potential enhancements for production use:
- Add TypeScript for type safety
- Implement undo/redo functionality
- Add node search and filtering
- Implement pipeline save/load
- Add more sophisticated error recovery
- Create node library with reusable templates
- Add collaborative editing features
- Implement pipeline execution engine

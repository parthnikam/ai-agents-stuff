# Learning About MCP Servers


### An Agent that uses Google Tools with MCP Server

```
User
 ↓
Agent loop / LLM
 ↓
MCP client
 ↓
Python MCP server
 ├── Google tools: Gmail / Calendar / Drive
 ├── Memory tools: store / search / summarize
 └── Local resources: notes, files, config
```


MCP is the protocol layer that lets an agent discover and call external tools through standardized servers. The official Python SDK supports building MCP servers and clients, and Google’s Python quickstarts use OAuth + Google client libraries for Calendar/Gmail-style API access.

### Project Structure
```
mcp-agent/
  pyproject.toml
  .env
  credentials.json          # Google OAuth client
  token.json                # generated after login
  mcp_server.py             # MCP server
  google_tools.py           # Google API wrappers
  memory.py                 # vector DB memory
  agent.py                  # MCP client + LLM loop
```



### Core Agentic Loop 

```
User task
 ↓
Agent loads:
  1. short-term chat history
  2. working task state
  3. relevant vector memories
 ↓
LLM thinks with available MCP tools
 ↓
Agent executes tool calls through MCP
 ↓
Tool results go back into the LLM
 ↓
Agent updates:
  - conversation history
  - task state
  - long-term memory
```


### Context stores
There are three types of memories the agent has to have: 
1. Short-term context: Current chat conversation 
2. Working memory: Current task's structured state
3. Long-term memory: Searchable vector DB of facts, preferences and other instructions


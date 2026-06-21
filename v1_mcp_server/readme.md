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

<<<<<<< HEAD
---

## Streamlit UI Web App

A simple web interface to interact with Google Tools (Calendar, Gmail, Drive).

### Running the Streamlit App

1. **Install dependencies** (if not already installed):
   ```bash
   pip install streamlit
   ```

2. **Run the Streamlit app**:
   ```bash
   streamlit run streamlit_app.py
   ```

3. **Access the app**:
   Open your browser to `http://localhost:8501`

### Features

The app provides a tabbed interface for:

#### 📅 **Google Calendar**
- List upcoming events (configurable days ahead)
- Create new events with title, date/time, description, and location
- Update existing events
- Delete events

#### 📧 **Gmail**
- Search messages with advanced queries
- Read individual messages
- Create draft emails
- Send emails directly

#### 📁 **Google Drive**
- Search files with custom queries
- Read file contents

### Authentication

The app uses your existing Google OAuth credentials stored in `token.json` and `credentials.json`. 
If credentials are missing or expired, the app will prompt you to authenticate when needed.

=======
>>>>>>> 7e321c1226411851244a847c725238925c734f39

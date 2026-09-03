---
name: openai-agents-sdk
description: Best practices for building AI agents, multi-agent systems, function tools, streaming, and LLM configuration using the official OpenAI Agents SDK in Python. Covers Agent definition, Runner execution, @function_tool declarations, agent handoffs, agents-as-tools orchestration, real-time response streaming (run_streamed), guardrails, alternative LLM endpoints (Gemini 2.5 Flash), and pytest mocking for AI workflows. Use this skill whenever implementing AI assistants, tool-calling agents, conversational task managers, or multi-agent routing.
---

# OpenAI Agents SDK (Python)

Comprehensive guide for building production-ready AI agents, function tools, multi-agent handoffs, and real-time streaming using the official **OpenAI Agents SDK** in Python.

---

## 🧭 Scope & Anti-Conflict Boundaries

| Area | Ownership |
|---|---|
| **AI Agent Logic & Runner** | ✅ **Covered in this skill** (`Agent`, `Runner`, instructions, system prompts) |
| **Tool Declarations** | ✅ **Covered in this skill** (`@function_tool` decorators, type hints, docstrings) |
| **Streaming & Handoffs** | ✅ **Covered in this skill** (`Runner.run_streamed`, agent handoff delegation) |
| **LLM Model Config** | ✅ **Covered in this skill** (OpenAI models & Gemini 2.5 Flash via OpenAI-compatible endpoints) |
| **Agent Testing / Mocking** | ✅ **Covered in this skill** (`pytest` fixtures, mocked LLM runs) |
| **FastAPI SSE HTTP Transport** | ❌ **NOT covered here**. FastAPI streaming endpoints belong to `fastapi-python-backend`. |

---

## 📦 Installation & Setup

Install via `uv`:
```bash
uv add openai-agents openai
```

---

## 🤖 Core Concepts: Agent & Runner

An **Agent** encapsulates an LLM configured with instructions, tools, and handoffs. The **Runner** manages the execution loop, invoking tools automatically until a final response is generated.

```python
# src/services/agent/basic_agent.py
from agents import Agent, Runner

triage_agent = Agent(
    name="Task Assistant",
    instructions="You are a helpful task management assistant. Answer user queries clearly.",
    model="gpt-4o-mini",
)

async def run_simple_prompt(prompt: str) -> str:
    result = await Runner.run(triage_agent, prompt)
    return result.final_output
```

---

## 🌐 Alternative LLM Configuration (e.g. Gemini 2.5 Flash)

You can configure alternative LLMs (such as **Gemini 2.5 Flash**) by pointing the OpenAI client to Gemini's OpenAI-compatible endpoint.

```python
# src/services/agent/llm_config.py
import os
from openai import AsyncOpenAI
from agents import Agent

# Point client to Google AI's OpenAI-compatible endpoint
custom_client = AsyncOpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=os.environ.get("GEMINI_API_KEY"),
)

task_agent = Agent(
    name="Gemini Task Agent",
    instructions="Manage tasks efficiently with natural language.",
    model="gemini-2.5-flash", # Gemini model identifier
    client=custom_client,
)
```

---

## 🛠️ Defining Function Tools (`@function_tool`)

Tools give agents the capability to query databases, call APIs, or execute actions. Always include descriptive docstrings and type annotations—the LLM reads docstrings to determine when and how to call the tool.

```python
# src/services/agent/tools.py
from agents import function_tool
from typing import List, Dict, Any

@function_tool
async def create_user_task(title: str, description: str = "") -> Dict[str, Any]:
    """Create a new task in the database for the user.

    Args:
        title: The short title of the task to be created.
        description: Optional extra details or notes for the task.
    """
    # Database interaction logic (SQLModel session)
    return {"status": "success", "task": {"title": title, "description": description}}

@function_tool
async def search_user_tasks(query: str) -> List[Dict[str, Any]]:
    """Search the user's existing tasks by keyword or phrase.

    Args:
        query: Search term to filter tasks.
    """
    return [{"id": 1, "title": "Buy groceries", "completed": False}]
```

Attach tools to the agent:
```python
task_agent = Agent(
    name="Task Master",
    instructions="Help the user manage their tasks by creating, searching, and updating them.",
    tools=[create_user_task, search_user_tasks],
)
```

---

## 🔀 Agent Handoffs & Multi-Agent Swarms

Use **handoffs** to transfer control from a general router agent to a specialist agent.

```python
# src/services/agent/multi_agent.py
from agents import Agent, Runner

# Specialist Agents
support_agent = Agent(
    name="Support Specialist",
    instructions="Handle customer support and troubleshooting issues.",
)

task_agent = Agent(
    name="Task Specialist",
    instructions="Handle task creation, scheduling, and management.",
    tools=[create_user_task],
)

# Manager / Triage Agent
manager_agent = Agent(
    name="Manager Agent",
    instructions="Analyze the user request and hand off to either Support Specialist or Task Specialist.",
    handoffs=[support_agent, task_agent],
)

async def process_user_message(message: str):
    result = await Runner.run(manager_agent, message)
    return result.final_output
```

---

## 📡 Real-Time Response Streaming (`run_streamed`)

For real-time UI updates (e.g. streaming tokens over SSE), use `Runner.run_streamed()`.

```python
# src/services/agent/streaming_service.py
from typing import AsyncGenerator
from agents import Runner, Agent

async def stream_agent_response(agent: Agent, prompt: str) -> AsyncGenerator[str, None]:
    """Streams agent thought tokens and output in real time."""
    result = Runner.run_streamed(agent, prompt)
    
    async for event in result.stream_events():
        # Capture text delta events
        if event.type == "raw_response_delta":
            delta = event.data.delta
            if delta and hasattr(delta, "content") and delta.content:
                yield delta.content
```

---

## 🧪 Testing & Mocking Agents with `pytest`

Avoid making expensive, non-deterministic live API calls in automated unit tests. Mock the agent execution results.

```python
# tests/test_agent.py
import pytest
from unittest.mock import AsyncMock, patch
from src.services.agent.basic_agent import run_simple_prompt

@pytest.mark.asyncio
async def test_agent_run_mocked():
    with patch("agents.Runner.run", new_callable=AsyncMock) as mock_run:
        mock_run.return_value.final_output = "Task 'Buy milk' created successfully."
        
        output = await run_simple_prompt("Add buy milk")
        
        assert "Buy milk" in output
        mock_run.assert_called_once()
```

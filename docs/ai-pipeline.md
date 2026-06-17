# AI Pipeline

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM ORCHESTRATOR                          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Bug      │  │ Test Gen │  │ Triage   │  │ RAG      │   │
│  │ Classify │  │ Agent    │  │ Agent    │  │ Agent    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Agent Coordination Layer                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Model Router (via 9Router)                 │   │
│  │  Qoder → classification, RAG retrieval               │   │
│  │  Antigravity → test generation, complex reasoning    │   │
│  │  OpenCode Free → formatting, simple tasks            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Bug Classification

```
PROMPT:
You are a QA triage specialist. Given a bug report with full context:

1. Duplicate Detection — compare against recent bugs (similarity > 0.85)
2. Severity Assessment:
   - P0: critical path broken, revenue impact, no workaround
   - P1: major feature broken, workaround exists
   - P2: minor feature broken
   - P3: cosmetic / edge case
3. Component Routing — from URL paths, stack traces, error messages
4. Risk Score (0-10)
5. Regression Zones — affected modules from known coupling

OUTPUT:
{
  "duplicate_of": null | "uuid",
  "similar_bugs": [{"id": "uuid", "title": "...", "score": 0.0-1.0}],
  "severity": "P0"|"P1"|"P2"|"P3",
  "component": "component-name",
  "risk_score": 0.0-10.0,
  "regression_zones": ["module-a", "module-b"]
}
```

## Test Generation

```
PROMPT:
You are a test automation expert. Given a bug report or PR diff,
generate comprehensive test cases.

INPUT: bug with steps to reproduce, OR PR diff with changed files

OUTPUT per test: title, preconditions, steps, expected results,
edge cases, Playwright/Cypress code

RULES:
- Independent tests (no shared state)
- data-testid selectors preferred
- No fixed sleeps (use proper waits)
- Include cleanup/teardown
- Parameterize for cross-browser
```

## RAG Query

```
CAPABILITIES:
1. Answer with citations from source documents
2. Summarize trends, coverage, risks
3. Recommend strategies from historical patterns
4. Identify knowledge gaps

ROUTES:
  Route A: Vector search (semantic, top 20 → re-rank top 5)
  Route B: Graph traversal (entity relationships, top 10 nodes)
  Route C: SQL/time-series (structured data)
  Route D: Code search (AST-based function matching)

OUTPUT:
{
  "answer": "Markdown answer with citations",
  "sources": [{"id", "title", "source_type", "excerpt", "url", "score"}],
  "confidence": 0.0-1.0,
  "suggested_followups": ["Question 1?", "Question 2?"]
}
```

## Multi-Agent Orchestration

```python
class PROrchestrator:
    async def handle(self, event: PREvent):
        diff_analysis = await self.analyze_diff(event.diff)
        risk_scores = await self.calculate_risk(event, diff_analysis)

        if risk_scores.overall > 5.0:
            tasks = []
            for fn in diff_analysis.changed_functions[:5]:
                tasks.append(self.test_gen_agent.generate(
                    source_type="code", source=fn,
                    framework=event.project.framework))
            generated_tests = await asyncio.gather(*tasks)

            prioritized = self.prioritize_tests(generated_tests, risk_scores)
            comment = self.format_pr_comment(risk_scores, prioritized[:3])
            await self.create_pr_comment(event.pr_number, comment)

            if event.project.settings.auto_run_pr_tests:
                await self.trigger_test_run(
                    project_id=event.project_id,
                    test_ids=[t.id for t in prioritized[:3]],
                    branch=event.branch)
```

## Model Routing

| Task | Model (via 9Router) | Rationale |
|---|---|---|
| Bug classification | Qoder | Cheap, fast, good enough |
| Test generation | Antigravity | Needs stronger reasoning |
| RAG embedding | Qoder | High throughput needed |
| RAG answer | Qoder / Antigravity | Based on complexity |
| Formatting | OpenCode Free | Free, trivial task |
| Session analysis | Qoder | Bulk processing |

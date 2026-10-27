# Architecture Decision Record (ADR) 002: Agentic Tool Calling vs. Static Routing

## Status
Accepted / In Production

## Context
Tier-1 customer operations handle unpredictable natural-language inquiries ranging from simple status checks to complex multi-step account modifications. Traditionally, integration teams build massive 40-50 branch routers with brittle regular expressions and keyword matching.

## Decision
We implemented an **Autonomous Multi-Tool Agentic Reasoner** using OpenAI and Make function calling modules:
1. Dynamic Tool Dispatch: Exposes isolated Make modules as callable tools.
2. Stateful Conversation Memory: Preserves multi-turn session context via Data Stores.
3. Deterministic Risk Gate: Evaluates confidence (`>= 85%`) and monetary value (`< $100`). High-risk actions automatically freeze execution and dispatch interactive approval cards to Slack.

## Alternatives Considered
- **Monolithic Decision Trees**: High maintenance overhead; breaks on colloquial phrasing or multilingual inputs.
- **Pure Autonomous LLM Without Gates**: Unacceptable business risk of hallucinated actions (e.g., unauthorized refunds).

## Consequences
- **Positive**: First-response time dropped by 78%; zero unauthorized high-risk mutations; fully auditable decision trail.
- **Negative**: Adds ~500ms LLM inference latency compared to static routing.

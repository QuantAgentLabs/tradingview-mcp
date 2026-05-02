---
name: tradingview
description: General TradingView workflow router. Use when the user wants to work with a TradingView chart, quote, indicator, Pine Script, replay session, screenshot, or layout and the best specific workflow is not yet obvious.
---

# TradingView Workflow Router

Use this skill as the default entrypoint for TradingView work in Codex.

## Core Principle

Do not make the user name individual MCP tools unless they want to. Translate the request into the right TradingView MCP workflow.

## Common Routing

### "What's on my chart?"
1. `chart_get_state`
2. `data_get_study_values`
3. `quote_get`
4. `capture_screenshot` if visual confirmation helps

### "Give me a chart analysis"
1. `chart_get_state`
2. `quote_get`
3. `data_get_study_values`
4. `data_get_pine_lines`
5. `data_get_pine_labels`
6. `data_get_ohlcv` with `summary: true`
7. `capture_screenshot`

### "Change symbol / timeframe / chart type"
- `chart_set_symbol`
- `chart_set_timeframe`
- `chart_set_type`

### "Work on Pine Script"
1. `pine_get_source` only if you truly need the current code
2. `pine_set_source`
3. `pine_smart_compile`
4. `pine_get_errors`
5. `pine_get_console`

### "Read custom Pine labels / levels / tables"
- `data_get_pine_lines`
- `data_get_pine_labels`
- `data_get_pine_tables`
- `data_get_pine_boxes`

### "Replay"
- `replay_start`
- `replay_step`
- `replay_autoplay`
- `replay_trade`
- `replay_status`
- `replay_stop`

### "Health / connection"
- `tv_health_check`
- `tv_launch`

## Context Discipline

- Prefer `data_get_ohlcv` with `summary: true`
- Use `study_filter` when targeting a specific indicator
- Avoid large raw payloads unless the user asks for them
- Prefer screenshots when visual state matters

## Response Style

When the user asks a market question like current price, chart state, setup, or indicator readings, answer directly and plainly after using the right MCP tools.

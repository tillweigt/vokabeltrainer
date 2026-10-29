# Kurzbefehle für den Vokabeltrainer. Ohne Ziel zeigt `make` diese Übersicht.

PORT ?= 8000
ARGS ?=

.PHONY: help serve test unit e2e

help: ## Übersicht der Befehle
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-6s %s\n", $$1, $$2}'

serve: ## Website lokal starten, ohne Browser-Cache (PORT=8000), beenden mit Strg+C
	python3 tools/serve.py $(PORT)

test: unit e2e ## Alle Tests: erst Unit-Tests, dann E2E-Tests

unit: ## Unit-Tests für js/logic.js mit node --test
	node --test --test-reporter=spec tests/*.test.js

e2e: ## E2E-Tests im simulierten iPhone-Browser (ARGS="..." für pytest)
	uv run --with pytest-playwright pytest tests/e2e $(ARGS)

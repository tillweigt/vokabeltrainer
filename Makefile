# Kurzbefehle für den Vokabeltrainer. Ohne Ziel zeigt `make` diese Übersicht.

PORT ?= 8000
ARGS ?=

.PHONY: help serve test

help: ## Übersicht der Befehle
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-6s %s\n", $$1, $$2}'

serve: ## Website lokal starten (PORT=8000), beenden mit Strg+C
	@echo "Läuft auf http://localhost:$(PORT) – beenden mit Strg+C"
	python3 -m http.server $(PORT)

test: ## E2E-Tests im simulierten iPhone-Browser (ARGS="..." für pytest)
	uv run --with pytest-playwright pytest tests/e2e $(ARGS)

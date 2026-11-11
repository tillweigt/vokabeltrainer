# Kurzbefehle für den Vokabeltrainer. Ohne Ziel zeigt `make` diese Übersicht.

PORT ?= 8000
ARGS ?=

# Die Auswertung braucht npm-Pakete; neu installiert wird nur, wenn sich package-lock.json ändert
NODE_MODULES := auswertung/node_modules/.package-lock.json

# Feste Playwright-Version für die E2E-Tests, passend zum installierten Chromium (Build 1248).
# Ohne sie holt uv immer die neueste, und die sucht einen Chromium-Build, der nicht installiert ist.
# Beim Erhöhen einmal den Browser neu laden: uv run --with $(PLAYWRIGHT) playwright install chromium
PLAYWRIGHT := playwright==1.64.1

.PHONY: help serve test unit e2e auswertung auswertung-test auswertung-build

help: ## Übersicht der Befehle
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-17s %s\n", $$1, $$2}'

serve: ## Website lokal starten, ohne Browser-Cache (PORT=8000), beenden mit Strg+C
	python3 tools/serve.py $(PORT)

test: unit auswertung-test e2e ## Alle Tests: App, Auswertung, dann E2E-Tests

unit: ## Unit-Tests für js/logic.js mit node --test
	node --test --test-reporter=spec tests/*.test.js

e2e: auswertung-build ## E2E-Tests: App im simulierten iPhone, Auswertung am Desktop (ARGS="..." für pytest)
	uv run --with pytest-playwright --with $(PLAYWRIGHT) pytest tests/e2e $(ARGS)

auswertung: $(NODE_MODULES) ## Auswertung lokal starten (http://localhost:5173), beenden mit Strg+C
	cd auswertung && npm run dev

auswertung-test: $(NODE_MODULES) ## Auswertung: Typprüfung und Unit-Tests mit Vitest
	cd auswertung && npm run typecheck && npm test

auswertung-build: $(NODE_MODULES) ## Auswertung bauen (nach auswertung/dist)
	cd auswertung && npm run build

$(NODE_MODULES): auswertung/package-lock.json
	cd auswertung && npm ci
	@touch $@

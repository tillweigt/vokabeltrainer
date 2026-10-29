"""Lokaler Entwicklungsserver für den Vokabeltrainer.

Wie `python3 -m http.server`, aber:
- schickt `Cache-Control: no-store`, damit der Browser nach jeder Änderung den
  aktuellen Code lädt (sonst zeigt er gern alten JavaScript-Code aus dem Cache),
- liefert Textdateien mit `charset=utf-8` aus, damit Umlaute auch beim direkten
  Ansehen einer .js-Datei im Browser richtig erscheinen.

Aufruf: python3 tools/serve.py [PORT]   (Standard: 8000)
"""

import functools
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".md": "text/plain; charset=utf-8",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with ThreadingHTTPServer(("", port), handler) as server:
        print(f"Läuft auf http://localhost:{port} – beenden mit Strg+C", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nBeendet.")


if __name__ == "__main__":
    main()

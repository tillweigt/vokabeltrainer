"""Gemeinsame Fixtures für die E2E-Tests.

Startet einen lokalen Webserver für das Projekt und lässt Chromium ein iPhone simulieren.
Aufruf (im Projektordner):  uv run --with pytest-playwright pytest tests/e2e
"""

import copy
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]

# Kleine, feste Testliste: unabhängig von den echten Inhalten,
# mit Mehrdeutigkeit („Ich heiße …“) und Platzhaltern („…“).
MINI_LIST = {
    "id": "test-mini",
    "titel": "Testliste",
    "fach": "Englisch",
    "typ": "vokabel",
    "durchlauf": 1,
    "items": [
        {"en": "I'm …", "de": ["Ich heiße …", "Ich bin …"]},
        {"en": "My name is …", "de": ["Ich heiße …"]},
        {"en": "What's your name?", "de": ["Wie heißt du?"]},
        {"en": "boy", "de": ["Junge"]},
    ],
}


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="session")
def base_url():
    port = _free_port()
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", ROOT],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    deadline = time.monotonic() + 10
    while True:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                break
        except OSError:
            if time.monotonic() > deadline:
                server.kill()
                raise RuntimeError("Testserver startet nicht")
            time.sleep(0.05)
    yield f"http://127.0.0.1:{port}"
    server.terminate()
    server.wait()


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, playwright):
    """iPhone-Display, Touch und Safari-User-Agent simulieren (die Engine bleibt Chromium)."""
    iphone = dict(playwright.devices["iPhone 13"])
    iphone.pop("default_browser_type", None)
    return {**browser_context_args, **iphone}


@pytest.fixture
def mini_list(page):
    """Ersetzt die echten Listen durch MINI_LIST. Änderungen am Rückgabewert wirken beim nächsten Laden."""
    data = copy.deepcopy(MINI_LIST)
    page.route("**/lists/index.json", lambda route: route.fulfill(json=["test-mini"]))
    page.route("**/lists/test-mini.json", lambda route: route.fulfill(json=data))
    return data

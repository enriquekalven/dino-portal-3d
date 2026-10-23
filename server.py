#!/usr/bin/env python3
"""Local HTTP server for ChronoSauria 3D Dinosaur Portal.

- Static files bound strictly to 127.0.0.1 with CSP, nosniff, DENY and directory-boundary validation.
- POST /api/tts : same-origin proxy to Google Cloud Text-to-Speech (Chirp 3 HD voices) so no
  credential ever reaches the browser. Credentials come from GOOGLE_TTS_API_KEY or the local
  gcloud CLI (`gcloud auth print-access-token`). Responses are cached in memory and rate-limited.
- GET  /api/tts/status : reports whether Chirp narration is available (never leaks secrets).
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import OrderedDict
from urllib.parse import unquote, urlsplit

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8092
ROOT_DIR = Path(__file__).resolve().parent

TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize"
TTS_MAX_CHARS = 1800
TTS_MAX_BODY_BYTES = 16 * 1024
TTS_CACHE_SIZE = 96
TTS_RATE_LIMIT_PER_MINUTE = 30
TTS_DEFAULT_VOICE = "en-US-Chirp3-HD-Aoede"
TTS_ALLOWED_VOICES = {
    "en-US-Chirp3-HD-Aoede",
    "en-US-Chirp3-HD-Leda",
    "en-US-Chirp3-HD-Kore",
    "en-US-Chirp3-HD-Zephyr",
    "en-US-Chirp3-HD-Despina",
    "en-US-Chirp3-HD-Puck",
    "en-US-Chirp3-HD-Charon",
    "en-US-Chirp3-HD-Fenrir",
    "en-US-Chirp3-HD-Orus",
    "en-US-Chirp3-HD-Achird",
}


class ChirpCredentialProvider:
    """Resolves Google Cloud credentials for Text-to-Speech without exposing them to clients."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._token = None
        self._token_expires = 0.0
        self._project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCLOUD_PROJECT")
        self._gcloud = shutil.which("gcloud")
        self.api_key = os.environ.get("GOOGLE_TTS_API_KEY", "").strip() or None

    @property
    def mode(self) -> str:
        if self.api_key:
            return "api_key"
        if self._gcloud:
            return "gcloud"
        return "none"

    def _run_gcloud(self, args):
        env = dict(os.environ)
        existing = env.get("CLOUDSDK_METRICS_ENVIRONMENT", "")
        env["CLOUDSDK_METRICS_ENVIRONMENT"] = (existing + " " if existing else "") + "datacloud.antigravity"
        result = subprocess.run(  # noqa: S603 - fixed argv, no shell
            [self._gcloud, *args],
            capture_output=True,
            text=True,
            timeout=25,
            env=env,
            check=False,
        )
        if result.returncode != 0:
            return None
        return result.stdout.strip()

    def project(self):
        if self._project:
            return self._project
        if self._gcloud:
            with self._lock:
                if not self._project:
                    value = self._run_gcloud(["config", "get-value", "project"])
                    if value and value != "(unset)":
                        self._project = value
        return self._project

    def access_token(self):
        if not self._gcloud:
            return None
        with self._lock:
            if self._token and time.time() < self._token_expires:
                return self._token
            token = self._run_gcloud(["auth", "print-access-token"])
            if token:
                self._token = token
                self._token_expires = time.time() + 45 * 60
            return self._token

    def invalidate_token(self) -> None:
        with self._lock:
            self._token = None
            self._token_expires = 0.0


class ChirpSynthesizer:
    """Thin, cached, rate-limited client for the Text-to-Speech REST API."""

    def __init__(self, credentials: ChirpCredentialProvider) -> None:
        self.credentials = credentials
        self._cache = OrderedDict()
        self._cache_lock = threading.Lock()
        self._rate_lock = threading.Lock()
        self._request_times = []

    def available(self) -> bool:
        return self.credentials.mode != "none"

    def _rate_limited(self) -> bool:
        now = time.time()
        with self._rate_lock:
            self._request_times = [t for t in self._request_times if now - t < 60.0]
            if len(self._request_times) >= TTS_RATE_LIMIT_PER_MINUTE:
                return True
            self._request_times.append(now)
            return False

    def synthesize(self, text: str, voice: str, rate: float):
        """Returns (status_code, payload_bytes_or_error_dict, content_type)."""
        key = hashlib.sha256(f"{voice}|{rate:.2f}|{text}".encode("utf-8")).hexdigest()
        with self._cache_lock:
            cached = self._cache.get(key)
            if cached is not None:
                self._cache.move_to_end(key)
                return 200, cached, "audio/mpeg"

        if self._rate_limited():
            return 429, {"error": "rate_limited"}, "application/json"

        body = {
            "input": {"text": text},
            "voice": {"languageCode": "en-US", "name": voice},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": rate},
        }
        audio = self._request(body)
        if isinstance(audio, dict):
            return audio.get("status", 502), {"error": audio.get("error", "tts_failed")}, "application/json"

        with self._cache_lock:
            self._cache[key] = audio
            self._cache.move_to_end(key)
            while len(self._cache) > TTS_CACHE_SIZE:
                self._cache.popitem(last=False)
        return 200, audio, "audio/mpeg"

    def _request(self, body: dict, retry: bool = True):
        url = TTS_ENDPOINT
        headers = {"Content-Type": "application/json; charset=utf-8"}
        if self.credentials.api_key:
            url = f"{TTS_ENDPOINT}?key={self.credentials.api_key}"
        else:
            token = self.credentials.access_token()
            if not token:
                return {"status": 503, "error": "tts_unavailable"}
            headers["Authorization"] = f"Bearer {token}"
            project = self.credentials.project()
            if project:
                headers["x-goog-user-project"] = project

        request = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=25) as response:  # noqa: S310 - fixed https endpoint
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 401 and retry and not self.credentials.api_key:
                self.credentials.invalidate_token()
                return self._request(body, retry=False)
            return {"status": 502 if err.code >= 500 else err.code, "error": "tts_upstream_error"}
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
            return {"status": 502, "error": "tts_network_error"}

        content = payload.get("audioContent")
        if not isinstance(content, str) or not content:
            return {"status": 502, "error": "tts_empty"}
        try:
            return base64.b64decode(content, validate=True)
        except (ValueError, TypeError):
            return {"status": 502, "error": "tts_decode_error"}


CREDENTIALS = ChirpCredentialProvider()
SYNTH = ChirpSynthesizer(CREDENTIALS)


def normalize_narration_text(raw) -> str:
    if not isinstance(raw, str):
        return ""
    cleaned = " ".join(raw.replace("\r", " ").replace("\n", " ").split())
    # Strip control characters; keep letters, digits, punctuation and common symbols.
    cleaned = "".join(ch for ch in cleaned if ch.isprintable())
    return cleaned[:TTS_MAX_CHARS]


class SecureStaticHandler(SimpleHTTPRequestHandler):
    """Static file handler with strict path traversal protection, CSP headers and the TTS proxy."""

    # Keep-alive lets browsers reuse a few connections for the ~20 ES-module fetches
    # instead of opening a fresh socket per file (which overflowed the default backlog).
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    # ------------------------------------------------------------------ static files
    def translate_path(self, path: str) -> str:
        raw_path = unquote(urlsplit(path).path)
        relative_part = raw_path.lstrip("/")
        candidate = (ROOT_DIR / relative_part).resolve()
        if candidate != ROOT_DIR and ROOT_DIR not in candidate.parents:
            return str(ROOT_DIR / "__forbidden__")
        return str(candidate)

    def end_headers(self) -> None:
        self.send_header(
            "Content-Security-Policy",
            (
                "default-src 'self'; "
                "script-src 'self' 'wasm-unsafe-eval'; "
                "style-src 'self'; "
                "img-src 'self' data: blob:; "
                "media-src 'self' blob:; "
                "connect-src 'self' blob: data:; "
                "worker-src 'self' blob:; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "frame-ancestors 'none'"
            ),
        )
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        if self.path.startswith("/vendor/models/"):
            self.send_header("Cache-Control", "public, max-age=86400")
        elif not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # keep logs free of narration payloads
        if self.path.startswith("/api/tts"):
            sys.stderr.write(f'{self.address_string()} - - [{self.log_date_time_string()}] "{self.command} {self.path}"\n')
            return
        super().log_message(fmt, *args)

    # ------------------------------------------------------------------ API helpers
    def _send_json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _same_origin_request(self) -> bool:
        """Custom header forces a CORS preflight for cross-site pages, which this server never grants."""
        if self.headers.get("X-Requested-With") != "DinoVerse":
            return False
        site = self.headers.get("Sec-Fetch-Site")
        if site and site not in ("same-origin", "none"):
            return False
        origin = self.headers.get("Origin")
        if origin and origin not in (f"http://{HOST}:{PORT}", f"http://localhost:{PORT}"):
            return False
        return True

    # ------------------------------------------------------------------ routes
    def do_GET(self) -> None:  # noqa: N802 - http.server naming
        route = urlsplit(self.path).path
        if route == "/api/tts/status":
            self._send_json(
                200,
                {
                    "available": SYNTH.available(),
                    "mode": CREDENTIALS.mode,
                    "defaultVoice": TTS_DEFAULT_VOICE,
                    "voices": sorted(TTS_ALLOWED_VOICES),
                    "maxChars": TTS_MAX_CHARS,
                },
            )
            return
        if route.startswith("/api/"):
            self._send_json(404, {"error": "not_found"})
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802 - http.server naming
        route = urlsplit(self.path).path
        if route != "/api/tts":
            self._send_json(404, {"error": "not_found"})
            return
        if not self._same_origin_request():
            self._send_json(403, {"error": "forbidden"})
            return
        if not SYNTH.available():
            self._send_json(503, {"error": "tts_unavailable"})
            return

        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("application/json"):
            self._send_json(415, {"error": "unsupported_media_type"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > TTS_MAX_BODY_BYTES:
            self._send_json(413, {"error": "payload_too_large"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self._send_json(400, {"error": "invalid_json"})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"error": "invalid_payload"})
            return

        text = normalize_narration_text(payload.get("text"))
        if len(text) < 2:
            self._send_json(400, {"error": "empty_text"})
            return
        voice = payload.get("voice") if payload.get("voice") in TTS_ALLOWED_VOICES else TTS_DEFAULT_VOICE
        try:
            rate = float(payload.get("rate", 0.95))
        except (TypeError, ValueError):
            rate = 0.95
        rate = max(0.7, min(1.25, rate))

        status, body, mime = SYNTH.synthesize(text, voice, rate)
        if status != 200:
            self._send_json(status, body)
            return
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "private, max-age=3600")
        self.send_header("X-Narrator-Voice", voice)
        self.end_headers()
        self.wfile.write(body)


class PortalServer(ThreadingHTTPServer):
    """Threaded server tuned for bursts of parallel ES-module requests."""

    request_queue_size = 128
    daemon_threads = True
    allow_reuse_address = True


def main() -> None:
    server = PortalServer((HOST, PORT), SecureStaticHandler)
    print(f"ChronoSauria 3D Dinosaur Portal running at http://{HOST}:{PORT}/")
    print(f"Chirp 3 HD narration: {'enabled via ' + CREDENTIALS.mode if SYNTH.available() else 'unavailable (device voice fallback)'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()


if __name__ == "__main__":
    main()

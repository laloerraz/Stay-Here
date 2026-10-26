"""Loopback-only visual test fixture; never needed to use the extension."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path == '/preview.html':
            html = (ROOT / 'popup.html').read_text(encoding='utf-8')
            html = html.replace('href="popup.css"', 'href="/popup.css"')
            html = html.replace('<script src="popup.js" defer></script>',
                                '<script src="/tests/preview-api.js"></script><script src="/popup.js" defer></script>')
            html = html.replace('<title>Stay Here</title>', '<title>Vista previa · Stay Here</title>')
            payload = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Local test server: http://127.0.0.1:{args.port}', flush=True)
    server.serve_forever()

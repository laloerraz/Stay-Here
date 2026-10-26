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
            html = (ROOT / 'extension' / 'popup.html').read_text(encoding='utf-8')
            html = html.replace('<head>', '<head><base href="/extension/">')
            html = html.replace('href="popup.css"', 'href="/extension/popup.css"')
            html = html.replace('<script src="popup.js" defer></script>',
                                '<script src="/tests/preview-api.js"></script><script src="/extension/popup.js" defer></script>')
            html = html.replace('src="i18n.js"', 'src="/extension/i18n.js"')
            html = html.replace('src="support-config.js"', 'src="/extension/support-config.js"')
            html = html.replace('src="icons/', 'src="/extension/icons/')
            html = html.replace('href="privacy.html"', 'href="/extension/privacy.html"')
            html = html.replace('<title>Stay Here</title>', '<title>Preview · Stay Here</title>')
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

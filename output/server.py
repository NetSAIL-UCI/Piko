from http.server import HTTPServer, SimpleHTTPRequestHandler

class DASHHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def guess_type(self, path):
        if path.endswith('.mpd'):
            return 'application/dash+xml'
        if path.endswith('.m4s'):
            return 'video/iso.segment'
        return super().guess_type(path)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

HTTPServer(('0.0.0.0', 8080), DASHHandler).serve_forever()
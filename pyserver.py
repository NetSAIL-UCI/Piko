from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

os.chdir('output')  # folder with DASH files
HTTPServer(('0.0.0.0', 8080), SimpleHTTPRequestHandler).serve_forever()
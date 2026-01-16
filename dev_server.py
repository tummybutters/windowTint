#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REWRITE_PATHS = {
    "/": "/index",
    "/services": "/window-tinting-gallery",
    "/irvine-window-tinting": "/irvine",
    "/newport-beach-window-tinting": "/newport-beach",
    "/tustin-window-tinting": "/tustin",
    "/costa-mesa-window-tinting": "/costa-mesa-windowtinting",
    "/laguna-beach-window-tinting": "/laguna-beach-windowtinting",
    "/aliso-viejo-window-tinting": "/aliso-viejo-windowtinting",
}


class ExtensionlessHTMLHandler(SimpleHTTPRequestHandler):
    # Serve the extensionless index file and treat extensionless files as HTML.
    def _rewrite_path(self):
        if self.path in REWRITE_PATHS:
            self.path = REWRITE_PATHS[self.path]

    def do_GET(self):
        self._rewrite_path()
        super().do_GET()

    def do_HEAD(self):
        self._rewrite_path()
        super().do_HEAD()

    def guess_type(self, path):
        if Path(path).suffix == "":
            return "text/html; charset=utf-8"
        return super().guess_type(path)


def main():
    server = ThreadingHTTPServer(("", 5173), ExtensionlessHTMLHandler)
    print("Serving extensionless HTML on http://localhost:5173")
    server.serve_forever()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REWRITE_PATHS = {
    "/": "/index",
    "/services": "/services",
    "/window-tint-pricing": "/window-tint-pricing",
    "/ceramic-window-tinting": "/ceramic-window-tinting",
    "/mobile-window-tinting": "/mobile-window-tinting",
    "/full-car-window-tinting": "/full-car-window-tinting",
    "/sides-rear-window-tinting": "/sides-rear-window-tinting",
    "/front-two-window-tinting": "/front-two-window-tinting",
    "/windshield-window-tinting": "/windshield-window-tinting",
    "/tesla-window-tinting": "/tesla-window-tinting",
    "/tesla-tint-quote": "/tesla-tint-quote",
    "/tesla-model-y-window-tint": "/tesla-model-y-window-tint/index.html",
    "/tesla-model-3-window-tint": "/tesla-model-3-window-tint/index.html",
    "/tesla-cybertruck-window-tint": "/tesla-cybertruck-window-tint/index.html",
    "/mobile-window-tinting-near-me": "/mobile-window-tinting-near-me",
    "/mobile-window-tinting-summer-offer": "/mobile-window-tinting-summer-offer",
    "/mobile-ceramic-window-tint-near-me": "/mobile-ceramic-window-tint-near-me/index.html",
    "/windshield-ceramic-tint": "/windshield-ceramic-tint",
    "/ceramic-window-tint-pricing": "/ceramic-window-tint-pricing",
    "/nano-ceramic-window-tint": "/nano-ceramic-window-tint/index.html",
    "/ceramic-coating-cost-paint-correction": "/ceramic-coating-cost-paint-correction",
    "/ceramic-coating-irvine": "/ceramic-coating-irvine",
    "/ceramic-coating-lake-forest": "/ceramic-coating-lake-forest",
    "/ceramic-coating-aliso-viejo": "/ceramic-coating-aliso-viejo",
    "/ceramic-coating-newport-beach": "/ceramic-coating-newport-beach",
    "/ceramic-coating-costa-mesa": "/ceramic-coating-costa-mesa",
    "/ceramic-coating-tustin": "/ceramic-coating-tustin",
    "/ceramic-coating-mission-viejo": "/ceramic-coating-mission-viejo",
    "/ceramic-coating-laguna-hills": "/ceramic-coating-laguna-hills",
    "/luxury-ev-ceramic-coating": "/luxury-ev-ceramic-coating",
    "/tint-removal": "/tint-removal",
    "/irvine-window-tinting": "/irvine",
    "/newport-beach-window-tinting": "/newport-beach",
    "/tustin-window-tinting": "/tustin",
    "/irvine-windowtinting": "/irvine",
    "/newport-beach-windowtinting": "/newport-beach",
    "/tustin-windowtinting": "/tustin",
    "/costa-mesa-window-tinting": "/costa-mesa-windowtinting",
    "/laguna-beach-window-tinting": "/laguna-beach-windowtinting",
    "/aliso-viejo-window-tinting": "/aliso-viejo-windowtinting",
    "/window-tint-shades": "/window-tint-shades",
    "/california-window-tint-law": "/california-window-tint-law",
    "/tesla-model-y-window-tinting": "/tesla-model-y-window-tinting",
    "/tesla-model-3-window-tinting": "/tesla-model-3-window-tinting",
    "/architectural-window-film": "/architectural-window-film",
    "/commercial-window-film": "/commercial-window-film",
    "/commercial-window-film-socal": "/commercial-window-film-socal",
    "/chrome-delete": "/chrome-delete",
    "/santa-ana-window-tinting": "/santa-ana-window-tinting",
    "/anaheim-window-tinting": "/anaheim-window-tinting",
    "/huntington-beach-window-tinting": "/huntington-beach-window-tinting",
    "/orange-window-tinting": "/orange-window-tinting",
    "/mission-viejo-window-tinting": "/mission-viejo-window-tinting",
    "/lake-forest-window-tinting": "/lake-forest-window-tinting",
    "/dana-point-window-tinting": "/dana-point-window-tinting",
    "/san-clemente-window-tinting": "/san-clemente-window-tinting",
    "/ceramic-vs-carbon-window-tint": "/ceramic-vs-carbon-window-tint",
    "/how-long-does-window-tinting-take": "/how-long-does-window-tinting-take",
    "/is-mobile-window-tinting-worth-it": "/is-mobile-window-tinting-worth-it",
    "/how-to-choose-window-tint-percentage": "/how-to-choose-window-tint-percentage",
    "/does-window-tint-reduce-heat": "/does-window-tint-reduce-heat",
    "/window-tint-aftercare": "/window-tint-aftercare",
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

    def do_POST(self):
        if self.path == "/api/lead-events":
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404, "Not Found")

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

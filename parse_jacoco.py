from html.parser import HTMLParser

class JacocoParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_tbody = False
        self.in_tr = False
        self.in_td = False
        self.td_class = ''
        self.current_pkg = ''
        self.in_a = False
        self.results = []
        
    def handle_starttag(self, tag, attrs):
        if tag == 'tbody': self.in_tbody = True
        elif tag == 'tr': self.in_tr = True
        elif tag == 'td':
            self.in_td = True
            for k, v in attrs:
                if k == 'class': self.td_class = v
        elif tag == 'a' and self.in_td:
            self.in_a = True

    def handle_endtag(self, tag):
        if tag == 'tbody': self.in_tbody = False
        elif tag == 'tr':
            self.in_tr = False
            self.current_pkg = ''
        elif tag == 'td':
            self.in_td = False
            self.td_class = ''
        elif tag == 'a':
            self.in_a = False

    def handle_data(self, data):
        if self.in_tbody and self.in_tr:
            if self.in_a:
                self.current_pkg = data.strip()
            elif self.in_td and self.td_class == 'ctr2' and self.current_pkg:
                self.results.append((self.current_pkg, data.strip()))
                self.current_pkg = '' # Reset to only capture first ctr2

parser = JacocoParser()
try:
    with open('D:/project/egov-enterprise/build/reports/jacoco/aggregated/index.html', 'r', encoding='utf-8') as f:
        parser.feed(f.read())
    for pkg, cov in parser.results:
        print(f"{pkg}: {cov}")
except Exception as e:
    print('Error:', e)

import { describe, expect, it } from 'vitest';
import { sanitizePastedCmsHtml } from '../CmsRichTextEditor';

// 붙여넣기는 통째로 거절하지 않고 걷어 낸다 — 문서 앱(Excel·Word·웹 페이지)의 클립보드 HTML 은 머리에 meta·style 을 싣는다.
describe('콘텐츠 편집기 붙여넣기 정리', () => {
  it('Excel 표의 머리 style·meta 와 서식은 걷고 표 구조는 남긴다', () => {
    const html = '<html><head><meta name=ProgId content=Excel.Sheet><style>td{mso-number-format:General}</style></head>'
      + '<body><table style="width:100px"><tr><td class=xl65 style="color:red">구분</td><td colspan=2>내용</td></tr></table></body></html>';
    const cleaned = sanitizePastedCmsHtml(html);
    expect(cleaned).not.toMatch(/<style|<meta|mso-number-format|class=|style=/i);
    expect(cleaned).toContain('<table');
    expect(cleaned).toContain('colspan="2"');
    expect(cleaned).toContain('구분');
  });

  it('스크립트·이벤트·이미지·iframe 은 걷고 글자는 남긴다', () => {
    const cleaned = sanitizePastedCmsHtml('<meta charset="utf-8"><p onclick="x()">안내<img src="data:image/png;base64,AA"><script>x</script><iframe src="https://evil.example"></iframe></p>');
    expect(cleaned).not.toMatch(/onclick|<img|<script|<iframe/i);
    expect(cleaned).toContain('안내');
  });

  it('javascript 링크의 주소는 남기지 않는다', () => {
    const cleaned = sanitizePastedCmsHtml('<p><a href="javascript:alert(1)">나쁜</a> <a href="https://www.example.go.kr">좋은</a></p>');
    expect(cleaned).not.toMatch(/javascript:/i);
    expect(cleaned).toContain('href="https://www.example.go.kr"');
  });
});

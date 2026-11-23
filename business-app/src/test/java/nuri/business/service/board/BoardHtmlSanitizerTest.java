package nuri.business.service.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BoardHtmlSanitizer 게시글 본문 HTML 화이트리스트 소독 테스트")
class BoardHtmlSanitizerTest {

    @Test
    @DisplayName("null 과 빈 문자열은 그대로 돌려준다")
    void returnsNullAndEmptyAsIs() {
        assertThat(BoardHtmlSanitizer.sanitize(null)).isNull();
        assertThat(BoardHtmlSanitizer.sanitize("")).isEmpty();
    }

    @Test
    @DisplayName("일반 텍스트와 줄바꿈, 안전한 서식·표 마크업은 pretty-print 왜곡 없이 보존한다")
    void preservesSafeRichTextAndTables() {
        assertThat(BoardHtmlSanitizer.sanitize("일반 본문\n둘째 줄"))
                .isEqualTo("일반 본문\n둘째 줄");

        String richHtml = "<h1>제목</h1><p><strong>굵게</strong> <em>기울임</em> <u>밑줄</u> "
                + "<del>취소</del> <sup>1</sup><sub>2</sub> <mark>강조</mark></p>"
                + "<ul><li>항목1</li></ul><ol><li>순서1</li></ol>"
                + "<blockquote><pre><code>System.out.println();</code></pre></blockquote><hr>"
                + "<table><colgroup><col span=\"1\" width=\"120\"></colgroup>"
                + "<thead><tr><th scope=\"col\" colspan=\"1\" rowspan=\"1\">헤더</th></tr></thead>"
                + "<tbody><tr><td>값</td></tr></tbody></table>";

        String sanitized = BoardHtmlSanitizer.sanitize(richHtml);
        assertThat(sanitized)
                .contains("<h1>제목</h1>")
                .contains("<strong>굵게</strong>")
                .contains("<table>")
                .contains("<th scope=\"col\" colspan=\"1\" rowspan=\"1\">헤더</th>")
                .contains("<col span=\"1\" width=\"120\">");
    }

    @Test
    @DisplayName("script, svg, iframe, 이벤트 핸들러, 위험 URI 스킴을 제거한다")
    void stripsScriptsEventHandlersAndDangerousUris() {
        String dirty = "<p onclick=\"alert(1)\" onmouseover=\"steal()\">본문</p>"
                + "<script>alert('xss')</script>"
                + "<svg onload=\"alert(1)\"><circle /></svg>"
                + "<iframe srcdoc=\"<script>alert(1)</script>\"></iframe>"
                + "<object data=\"data:text/html,<script>alert(1)</script>\"></object>"
                + "<style>body { background: red; }</style>"
                + "<img src=\"javascript:alert(1)\" onerror=\"alert(2)\" alt=\"img1\">"
                + "<img src=\"data:image/svg+xml,<svg onload=alert(1)>\">"
                + "<a href=\"&#106;avascript:alert(1)\">bad-link</a>"
                + "<a href=\"vbscript:msgbox(1)\">vb-link</a>";

        String cleaned = BoardHtmlSanitizer.sanitize(dirty);

        assertThat(cleaned)
                .contains("<p>본문</p>")
                .doesNotContain("<script")
                .doesNotContain("alert(")
                .doesNotContain("<svg")
                .doesNotContain("<iframe")
                .doesNotContain("<object")
                .doesNotContain("<style")
                .doesNotContain("onclick")
                .doesNotContain("onmouseover")
                .doesNotContain("onerror")
                .doesNotContain("javascript:")
                .doesNotContain("vbscript:")
                .doesNotContain("data:image");
    }

    @Test
    @DisplayName("안전한 a/img 속성과 rel=noopener noreferrer 및 target=_blank 만 허용한다")
    void normalizesAnchorTargetAndPreservesSafeMediaUrls() {
        String html = "<p>"
                + "<a href=\"https://example.com/docs\" target=\"_BLANK\">외부</a> "
                + "<a href=\"mailto:ops@example.com\" target=\"evilFrame\">메일</a> "
                + "<a href=\"/relative/path\">상대경로차단</a>"
                + "<img src=\"https://cdn.example.com/pic.png\" alt=\"사진\" title=\"설명\" width=\"200\" height=\"100\">"
                + "</p>";

        String cleaned = BoardHtmlSanitizer.sanitize(html);

        assertThat(cleaned)
                .contains("href=\"https://example.com/docs\"")
                .contains("target=\"_blank\"")
                .contains("rel=\"noopener noreferrer\"")
                .contains("href=\"mailto:ops@example.com\"")
                .doesNotContain("evilFrame")
                .doesNotContain("/relative/path")
                .contains("src=\"https://cdn.example.com/pic.png\"")
                .contains("alt=\"사진\"")
                .contains("width=\"200\"");
    }

    @Test
    @DisplayName("허용된 CSS 속성·값만 남기고 위험하거나 잘못된 style 선언은 제거한다")
    void sanitizesInlineStylesToStrictAllowlist() {
        String html = "<p style=\"TEXT-ALIGN: CENTER; color: red; background: url(javascript:alert(1)); width: 50%; : 1px; invalid\">a</p>"
                + "<div style=\"min-width: 120px; max-width: 12.5rem; position: fixed\">b</div>"
                + "<span style=\"expression(alert(1))\">c</span>";

        String cleaned = BoardHtmlSanitizer.sanitize(html);

        assertThat(cleaned)
                .contains("style=\"text-align: center; width: 50%\"")
                .contains("style=\"min-width: 120px; max-width: 12.5rem\"")
                .doesNotContain("color:")
                .doesNotContain("background")
                .doesNotContain("position")
                .doesNotContain("expression")
                .contains("<span>c</span>");
    }

    @Test
    @DisplayName("유효한 게시판 미디어 figure 마커는 유지하고 위조·불일치 참조 속성은 제거한다")
    void validatesBoardMediaFigures() {
        String validImage = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-회의_사진.png\" "
                + "data-media-kind=\"image\" data-media-label=\"회의 사진\"><figcaption>회의 사진</figcaption></figure>";
        String validMaxLabel = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-max.jpg\" "
                + "data-media-kind=\"image\" data-media-label=\"" + "a".repeat(300) + "\"></figure>";
        String validVideo = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-clip.webm\" "
                + "data-media-kind=\"video\" data-media-label=\"\"><figcaption>영상</figcaption></figure>";
        String validMp4 = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-clip.mp4\" "
                + "data-media-kind=\"video\" data-media-label=\"MP4\"><figcaption>MP4</figcaption></figure>";
        String mismatchedKind = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-photo.jpg\" "
                + "data-media-kind=\"video\" data-media-label=\"위조\"></figure>";
        String pathTraversal = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc/../evil.png\" "
                + "data-media-kind=\"image\" data-media-label=\"공격\"></figure>";
        String uppercaseExt = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-photo.PNG\" "
                + "data-media-kind=\"image\" data-media-label=\"대문자\"></figure>";
        String fileWithSpace = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-my photo.png\" "
                + "data-media-kind=\"image\" data-media-label=\"공백\"></figure>";
        String labelTooLong = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-ok.png\" "
                + "data-media-kind=\"image\" data-media-label=\"" + "a".repeat(301) + "\"></figure>";
        String fileTooLong = "<figure data-board-file=\"media-12345678-1234-4234-8234-123456789abc-" + "x".repeat(260) + ".png\" "
                + "data-media-kind=\"image\" data-media-label=\"긴파일명\"></figure>";

        assertThat(BoardHtmlSanitizer.sanitize(validImage))
                .contains("data-board-file=\"media-12345678-1234-4234-8234-123456789abc-회의_사진.png\"")
                .contains("data-media-kind=\"image\"")
                .contains("data-media-label=\"회의 사진\"");
        assertThat(BoardHtmlSanitizer.sanitize(validMaxLabel))
                .contains("data-board-file=\"media-12345678-1234-4234-8234-123456789abc-max.jpg\"");
        assertThat(BoardHtmlSanitizer.sanitize(validVideo))
                .contains("data-media-kind=\"video\"")
                .contains("data-board-file=\"media-12345678-1234-4234-8234-123456789abc-clip.webm\"");
        assertThat(BoardHtmlSanitizer.sanitize(validMp4))
                .contains("data-media-kind=\"video\"")
                .contains("data-board-file=\"media-12345678-1234-4234-8234-123456789abc-clip.mp4\"");
        for (String invalid : java.util.List.of(mismatchedKind, pathTraversal, uppercaseExt, fileWithSpace, labelTooLong, fileTooLong)) {
            assertThat(BoardHtmlSanitizer.sanitize(invalid))
                    .doesNotContain("data-board-file")
                    .doesNotContain("data-media-kind")
                    .doesNotContain("data-media-label");
        }
    }
}

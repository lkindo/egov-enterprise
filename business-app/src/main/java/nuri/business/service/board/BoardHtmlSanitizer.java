package nuri.business.service.board;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Cleaner;
import org.jsoup.safety.Safelist;

/**
 * 게시글 리치 텍스트 본문({@code pstCn}) HTML 화이트리스트 기반 서버 측 소독기.
 *
 * <p>TipTap 리치 텍스트 편집기·표·게시판 미디어 참조({@code figure[data-board-file]})만 보존하고
 * 스크립트, 이벤트 핸들러, 위험 URI 스킴({@code javascript:}, {@code vbscript:}, {@code data:}),
 * 허용 목록 밖 CSS 선언을 저장·조회 경계에서 제거한다.
 */
final class BoardHtmlSanitizer {

    private static final Pattern BOARD_MEDIA_FILE_PATTERN = Pattern.compile(
            "^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[\\p{L}\\p{N}._-]{1,180}\\.(jpg|jpeg|png|gif|bmp|mp4|webm)$",
            Pattern.UNICODE_CHARACTER_CLASS);

    private static final Map<String, Pattern> ALLOWED_CSS_PROPERTIES = Map.of(
            "text-align", Pattern.compile("^(?:left|right|center|justify)$", Pattern.CASE_INSENSITIVE),
            "width", Pattern.compile("^\\d{1,5}(?:\\.\\d{1,2})?(?:px|%|em|rem)$", Pattern.CASE_INSENSITIVE),
            "min-width", Pattern.compile("^\\d{1,5}(?:\\.\\d{1,2})?(?:px|%|em|rem)$", Pattern.CASE_INSENSITIVE),
            "max-width", Pattern.compile("^\\d{1,5}(?:\\.\\d{1,2})?(?:px|%|em|rem)$", Pattern.CASE_INSENSITIVE));

    private static final Cleaner CLEANER = new Cleaner(buildSafelist());

    private BoardHtmlSanitizer() {
    }

    private static Safelist buildSafelist() {
        Safelist safelist = new Safelist()
                .addTags(
                        "p", "br", "div", "span", "blockquote", "pre", "code", "hr",
                        "h1", "h2", "h3", "h4", "h5", "h6",
                        "strong", "b", "em", "i", "u", "s", "strike", "del", "sub", "sup", "mark",
                        "ul", "ol", "li",
                        "a", "img",
                        "figure", "figcaption",
                        "table", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td")
                .addAttributes("a", "href", "target")
                .addProtocols("a", "href", "http", "https", "mailto")
                .addEnforcedAttribute("a", "rel", "noopener noreferrer")
                .addAttributes("img", "src", "alt", "title", "width", "height")
                .addProtocols("img", "src", "http", "https")
                .addAttributes("figure", "data-board-file", "data-media-kind", "data-media-label")
                .addAttributes("col", "span", "width")
                .addAttributes("th", "colspan", "rowspan", "scope")
                .addAttributes("td", "colspan", "rowspan")
                .preserveRelativeLinks(false);

        for (String styleTag : List.of("p", "h1", "h2", "h3", "h4", "h5", "h6", "th", "td", "table", "col", "span", "div")) {
            safelist.addAttributes(styleTag, "style");
        }
        return safelist;
    }

    static String sanitize(String rawHtml) {
        if (rawHtml == null || rawHtml.isEmpty()) {
            return rawHtml;
        }
        Document cleanDoc = CLEANER.clean(Jsoup.parseBodyFragment(rawHtml));
        cleanDoc.outputSettings().prettyPrint(false);
        normalizeLinks(cleanDoc);
        normalizeStyles(cleanDoc);
        normalizeBoardMediaFigures(cleanDoc);
        return cleanDoc.body().html();
    }

    private static void normalizeLinks(Document doc) {
        for (Element anchor : doc.select("a[target]")) {
            if ("_blank".equalsIgnoreCase(anchor.attr("target").trim())) {
                anchor.attr("target", "_blank");
            } else {
                anchor.removeAttr("target");
            }
        }
    }

    private static void normalizeStyles(Document doc) {
        for (Element el : doc.select("[style]")) {
            String sanitizedStyle = sanitizeStyle(el.attr("style"));
            if (sanitizedStyle.isEmpty()) {
                el.removeAttr("style");
            } else {
                el.attr("style", sanitizedStyle);
            }
        }
    }

    private static String sanitizeStyle(String style) {
        List<String> kept = new ArrayList<>();
        for (String declaration : style.split(";")) {
            int colonIndex = declaration.indexOf(':');
            if (colonIndex <= 0) {
                continue;
            }
            String property = declaration.substring(0, colonIndex).trim().toLowerCase(Locale.ROOT);
            String value = declaration.substring(colonIndex + 1).trim();
            Pattern allowed = ALLOWED_CSS_PROPERTIES.get(property);
            if (allowed != null && allowed.matcher(value).matches()) {
                kept.add(property + ": " + value.toLowerCase(Locale.ROOT));
            }
        }
        return String.join("; ", kept);
    }

    private static void normalizeBoardMediaFigures(Document doc) {
        for (Element figure : doc.select("figure[data-board-file]")) {
            String fileName = figure.attr("data-board-file").trim();
            String kind = figure.attr("data-media-kind").trim();
            String label = figure.attr("data-media-label");
            Matcher matcher = BOARD_MEDIA_FILE_PATTERN.matcher(fileName);
            boolean validReference = false;
            if (matcher.matches() && label.length() <= 300) {
                String ext = matcher.group(1);
                String expectedKind = ("mp4".equals(ext) || "webm".equals(ext)) ? "video" : "image";
                validReference = expectedKind.equals(kind);
            }
            if (!validReference) {
                figure.removeAttr("data-board-file");
                figure.removeAttr("data-media-kind");
                figure.removeAttr("data-media-label");
            }
        }
    }
}

package nuri.business.service.cms;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 콘텐츠 문서의 유일한 허용 판정(ADR-0039 결정 5). 초안 저장·게시가 모두 이것을 거치고, 통과한 정규화 문서만 저장한다.
 *
 * <p>문서 형식 v1: {@code {schemaVersion:1, sections:[...]}}. 영역은 단 구성(1단·2단 50:50·2단 40:60·3단)과 같은 수의 칸을 갖고,
 * 칸은 서식 본문(TipTap JSON)·이미지(페이지 소유 첨부)·바로가기 목록 중 하나다. 배경·간격은 의미 토큰 이름만 받는다.
 * 모르는 노드·표시(mark)·칸 종류·키는 거부한다 — 조용히 버려 저장하지 않는다. 알려진 노드의 모르는 속성은 그리지 않는 표시
 * 힌트(편집기가 덧붙이는 기본값 등)라 정규화에서 뺀다.
 *
 * <p>화면 렌더러({@code frontend/src/lib/cms/document.ts})는 같은 판정을 따르고, 두 구현은 같은 fixture
 * ({@code cms-document-fixtures.json})로 대조한다.
 */
@Component
public class CmsDocumentValidator {

    public static final int SCHEMA_VERSION = 1;
    public static final int MAX_BYTES = 1_048_576;
    static final int MAX_SECTIONS = 50;
    static final int MAX_DEPTH = 20;
    static final int MAX_BLOCKS = 2_000;
    static final int MAX_TABLE_ROWS = 100;
    static final int MAX_TABLE_COLUMNS = 20;
    static final int MAX_LINKS = 12;
    static final int MAX_URL_LENGTH = 2_000;

    private static final Pattern SECTION_ID = Pattern.compile("^[a-z0-9-]{1,40}$");
    private static final Pattern MAILTO = Pattern.compile("^mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern TEL = Pattern.compile("^tel:\\+?[0-9][0-9-]{1,30}$");
    private static final Pattern UNSAFE_URL_CHAR = Pattern.compile("[\\s\\\\\\u0000-\\u001f\\u007f]");
    private static final Pattern CONTROL = Pattern.compile("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]");

    private static final Map<String, Integer> LAYOUT_CELLS = Map.of("one", 1, "two", 2, "two-wide", 2, "three", 3);
    private static final Set<String> TONES = Set.of("default", "subtle", "emphasis");
    private static final Set<String> SPACINGS = Set.of("compact", "normal", "relaxed");
    private static final Set<String> ALIGNS = Set.of("left", "center", "right");
    private static final Set<String> SIMPLE_MARKS = Set.of("bold", "italic", "underline", "strike");

    private static final JsonNodeFactory NODES = JsonNodeFactory.instance;
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    /** 검증을 통과한 문서. {@code json} 은 저장할 정규화 JSON, {@code images} 는 이미지 칸이 가리키는 첨부 번호다. */
    public record Normalized(String json, ObjectNode document, Set<Long> images) {
    }

    /** 요청 본문에서 받은 문서(Map·List 트리)를 검증한다. */
    public Normalized normalize(Object raw) {
        if (raw == null) {
            throw invalid("문서", "문서가 비어 있습니다");
        }
        return normalizeTree(MAPPER.valueToTree(raw));
    }

    /** 저장된 JSON 을 다시 검증한다(게시 직전 — 검증 규칙이 바뀌었어도 지금 규칙을 통과한 문서만 게시한다). */
    public Normalized normalizeJson(String json) {
        return normalizeTree(MAPPER.readTree(json));
    }

    /** 두 문서가 같은 내용인지 본다. 저장 방식(jsonb 키 순서·공백)의 차이는 같다고 본다. */
    public boolean sameDocument(String left, String right) {
        return MAPPER.readTree(left).equals(MAPPER.readTree(right));
    }

    /** 저장된 문서를 응답에 실을 트리로 읽는다. */
    public Object toResponse(String json) {
        return MAPPER.convertValue(MAPPER.readTree(json), Object.class);
    }

    /** 링크 주소 판정(ADR-0039 결정 6): https·사이트 내부 경로·mailto·tel 만 받는다. 통과하면 정리한 값을, 아니면 null 을 준다. */
    public static String safeHref(String value) {
        if (value == null) {
            return null;
        }
        String href = value.strip();
        if (href.isEmpty() || href.length() > MAX_URL_LENGTH || UNSAFE_URL_CHAR.matcher(href).find()) {
            return null;
        }
        if (href.startsWith("/")) {
            return href.startsWith("//") ? null : href;
        }
        String lower = href.toLowerCase(Locale.ROOT);
        if (lower.startsWith("mailto:")) {
            return MAILTO.matcher(href).matches() ? href : null;
        }
        if (lower.startsWith("tel:")) {
            return TEL.matcher(href).matches() ? href : null;
        }
        if (!lower.startsWith("https://")) {
            return null;
        }
        try {
            URI uri = new URI(href);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getHost().isBlank()
                    || uri.getRawUserInfo() != null) {
                return null;
            }
            return href;
        } catch (URISyntaxException e) {
            return null;
        }
    }

    private Normalized normalizeTree(JsonNode root) {
        Context context = new Context();
        ObjectNode document = document(root, context);
        String json = MAPPER.writeValueAsString(document);
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw invalid("문서", "문서가 너무 큽니다(1MiB 초과). 영역이나 표를 나눠 주세요");
        }
        return new Normalized(json, document, Set.copyOf(context.images));
    }

    private ObjectNode document(JsonNode root, Context context) {
        object(root, "문서", Set.of("schemaVersion", "sections"));
        JsonNode version = root.get("schemaVersion");
        if (version == null || !version.isIntegralNumber() || version.intValue() != SCHEMA_VERSION) {
            throw invalid("문서", "지원하지 않는 문서 형식입니다");
        }
        ArrayNode sections = array(root.get("sections"), "영역 목록", 1, MAX_SECTIONS);
        ObjectNode result = NODES.objectNode();
        result.put("schemaVersion", SCHEMA_VERSION);
        ArrayNode outSections = result.putArray("sections");
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < sections.size(); i++) {
            outSections.add(section(sections.get(i), "영역 " + (i + 1), ids, context));
        }
        return result;
    }

    private ObjectNode section(JsonNode node, String path, Set<String> ids, Context context) {
        object(node, path, Set.of("id", "label", "layout", "tone", "spacing", "cells"));
        String id = text(node.get("id"), path + " 식별자", 40, true);
        if (!SECTION_ID.matcher(id).matches() || !ids.add(id)) {
            throw invalid(path, "영역 식별자가 올바르지 않거나 겹칩니다");
        }
        String label = text(node.get("label"), path + " 이름", 80, false);
        String layout = token(node.get("layout"), path + " 단 구성", LAYOUT_CELLS.keySet());
        String tone = token(node.get("tone"), path + " 배경", TONES);
        String spacing = token(node.get("spacing"), path + " 간격", SPACINGS);
        int expected = LAYOUT_CELLS.get(layout);
        ArrayNode cells = array(node.get("cells"), path + " 칸", expected, expected);
        ObjectNode result = NODES.objectNode();
        result.put("id", id);
        result.put("label", label);
        result.put("layout", layout);
        result.put("tone", tone);
        result.put("spacing", spacing);
        ArrayNode outCells = result.putArray("cells");
        for (int i = 0; i < cells.size(); i++) {
            outCells.add(cell(cells.get(i), path + " " + (i + 1) + "단", context));
        }
        return result;
    }

    private ObjectNode cell(JsonNode node, String path, Context context) {
        if (node == null || !node.isObject()) {
            throw invalid(path, "칸 형식이 올바르지 않습니다");
        }
        String kind = token(node.get("kind"), path + " 종류", Set.of("rich", "image", "links"));
        ObjectNode result = NODES.objectNode();
        result.put("kind", kind);
        switch (kind) {
            case "rich" -> {
                object(node, path, Set.of("kind", "doc"));
                result.set("doc", richDocument(node.get("doc"), path, context));
            }
            case "image" -> {
                object(node, path, Set.of("kind", "atchFileSn", "alt", "decorative", "caption"));
                JsonNode sn = node.get("atchFileSn");
                if (sn == null || !sn.isIntegralNumber() || sn.longValue() <= 0) {
                    throw invalid(path, "이미지를 선택해 주세요");
                }
                JsonNode decorativeNode = node.get("decorative");
                boolean decorative = decorativeNode != null && decorativeNode.isBoolean() && decorativeNode.booleanValue();
                if (decorativeNode != null && !decorativeNode.isBoolean()) {
                    throw invalid(path, "장식 이미지 여부가 올바르지 않습니다");
                }
                String alt = text(node.get("alt"), path + " 대체 텍스트", 300, false);
                if (!decorative && alt.isBlank()) {
                    throw invalid(path, "이미지 설명(대체 텍스트)을 입력하거나 장식 이미지로 지정해 주세요");
                }
                result.put("atchFileSn", sn.longValue());
                result.put("alt", decorative ? "" : alt);
                result.put("decorative", decorative);
                result.put("caption", text(node.get("caption"), path + " 설명", 300, false));
                context.images.add(sn.longValue());
            }
            default -> {
                object(node, path, Set.of("kind", "items"));
                ArrayNode items = array(node.get("items"), path + " 바로가기", 1, MAX_LINKS);
                ArrayNode outItems = result.putArray("items");
                for (int i = 0; i < items.size(); i++) {
                    String itemPath = path + " 바로가기 " + (i + 1);
                    JsonNode item = items.get(i);
                    object(item, itemPath, Set.of("title", "url"));
                    String title = text(item.get("title"), itemPath + " 이름", 100, true);
                    String url = safeHref(text(item.get("url"), itemPath + " 주소", MAX_URL_LENGTH, true));
                    if (url == null) {
                        throw invalid(itemPath, "주소는 https 주소, /로 시작하는 사이트 내부 경로, mailto·tel 만 쓸 수 있습니다");
                    }
                    ObjectNode outItem = outItems.addObject();
                    outItem.put("title", title);
                    outItem.put("url", url);
                }
            }
        }
        return result;
    }

    // ---- TipTap 문서 -------------------------------------------------------------------------------------------

    private ObjectNode richDocument(JsonNode node, String path, Context context) {
        if (node == null || !node.isObject() || !"doc".equals(stringOf(node.get("type")))) {
            throw invalid(path, "본문 형식이 올바르지 않습니다");
        }
        ObjectNode result = NODES.objectNode();
        result.put("type", "doc");
        ArrayNode content = optionalContent(node, path);
        ArrayNode out = result.putArray("content");
        for (JsonNode child : content) {
            out.add(block(child, path, 1, context));
        }
        if (out.isEmpty()) {
            out.addObject().put("type", "paragraph");
        }
        return result;
    }

    private ObjectNode block(JsonNode node, String path, int depth, Context context) {
        if (depth > MAX_DEPTH) {
            throw invalid(path, "본문이 너무 깊게 중첩됐습니다");
        }
        if (++context.blocks > MAX_BLOCKS) {
            throw invalid(path, "본문 요소가 너무 많습니다");
        }
        String type = nodeType(node, path);
        ObjectNode result = NODES.objectNode();
        result.put("type", type);
        JsonNode attrs = node.get("attrs");
        switch (type) {
            case "paragraph" -> {
                align(attrs, result);
                inlineContent(node, result, path);
            }
            case "heading" -> {
                JsonNode level = attrs == null ? null : attrs.get("level");
                if (level == null || !level.isIntegralNumber() || (level.intValue() != 2 && level.intValue() != 3)) {
                    throw invalid(path, "본문 제목은 제목 2·제목 3 만 쓸 수 있습니다");
                }
                ObjectNode outAttrs = result.putObject("attrs");
                outAttrs.put("level", level.intValue());
                String textAlign = alignOf(attrs);
                if (textAlign != null) {
                    outAttrs.put("textAlign", textAlign);
                }
                inlineContent(node, result, path);
            }
            case "bulletList", "orderedList" -> {
                if ("orderedList".equals(type)) {
                    JsonNode start = attrs == null ? null : attrs.get("start");
                    if (start != null && !start.isNull()) {
                        if (!start.isIntegralNumber() || start.intValue() < 1 || start.intValue() > 10_000) {
                            throw invalid(path, "번호 목록의 시작 번호가 올바르지 않습니다");
                        }
                        if (start.intValue() != 1) {
                            result.putObject("attrs").put("start", start.intValue());
                        }
                    }
                }
                children(node, result, path, depth, context, Set.of("listItem"), 1);
            }
            case "listItem" -> children(node, result, path, depth, context,
                    Set.of("paragraph", "bulletList", "orderedList"), 1);
            case "blockquote" -> children(node, result, path, depth, context, Set.of("paragraph"), 1);
            case "table" -> table(node, result, path, depth, context);
            default -> throw invalid(path, "본문에 쓸 수 없는 요소입니다(" + type + ")");
        }
        return result;
    }

    private void children(JsonNode node, ObjectNode result, String path, int depth, Context context,
            Set<String> allowed, int min) {
        ArrayNode content = optionalContent(node, path);
        if (content.size() < min) {
            throw invalid(path, "비어 있는 목록·인용은 쓸 수 없습니다");
        }
        ArrayNode out = result.putArray("content");
        for (JsonNode child : content) {
            String childType = nodeType(child, path);
            if (!allowed.contains(childType)) {
                throw invalid(path, "이 위치에 쓸 수 없는 요소입니다(" + childType + ")");
            }
            out.add(block(child, path, depth + 1, context));
        }
    }

    private void table(JsonNode node, ObjectNode result, String path, int depth, Context context) {
        ArrayNode rows = optionalContent(node, path);
        if (rows.isEmpty() || rows.size() > MAX_TABLE_ROWS) {
            throw invalid(path, "표는 1~" + MAX_TABLE_ROWS + "행이어야 합니다");
        }
        ArrayNode outRows = result.putArray("content");
        for (JsonNode row : rows) {
            if (!"tableRow".equals(nodeType(row, path))) {
                throw invalid(path, "표 안에는 행만 둘 수 있습니다");
            }
            ArrayNode cells = optionalContent(row, path);
            if (cells.isEmpty() || cells.size() > MAX_TABLE_COLUMNS) {
                throw invalid(path, "표의 한 행은 1~" + MAX_TABLE_COLUMNS + "칸이어야 합니다");
            }
            ObjectNode outRow = outRows.addObject();
            outRow.put("type", "tableRow");
            ArrayNode outCells = outRow.putArray("content");
            for (JsonNode cell : cells) {
                String cellType = nodeType(cell, path);
                if (!"tableCell".equals(cellType) && !"tableHeader".equals(cellType)) {
                    throw invalid(path, "표 행 안에는 칸만 둘 수 있습니다");
                }
                ObjectNode outCell = outCells.addObject();
                outCell.put("type", cellType);
                JsonNode attrs = cell.get("attrs");
                int colspan = boundedInt(attrs, "colspan", 1, MAX_TABLE_COLUMNS, path);
                int rowspan = boundedInt(attrs, "rowspan", 1, MAX_TABLE_ROWS, path);
                ObjectNode outAttrs = NODES.objectNode();
                if (colspan != 1) {
                    outAttrs.put("colspan", colspan);
                }
                if (rowspan != 1) {
                    outAttrs.put("rowspan", rowspan);
                }
                JsonNode widths = attrs == null ? null : attrs.get("colwidth");
                if (widths != null && !widths.isNull()) {
                    if (!widths.isArray() || widths.size() != colspan) {
                        throw invalid(path, "표 열 너비가 칸 수와 맞지 않습니다");
                    }
                    ArrayNode outWidths = NODES.arrayNode();
                    boolean any = false;
                    for (JsonNode width : widths) {
                        if (!width.isIntegralNumber() || width.intValue() < 0 || width.intValue() > 1200
                                || (width.intValue() > 0 && width.intValue() < 72)) {
                            throw invalid(path, "표 열 너비는 72~1200px 이어야 합니다");
                        }
                        any |= width.intValue() > 0;
                        outWidths.add(width.intValue());
                    }
                    if (any) {
                        outAttrs.set("colwidth", outWidths);
                    }
                }
                if (!outAttrs.isEmpty()) {
                    outCell.set("attrs", outAttrs);
                }
                children(cell, outCell, path, depth + 2, context, Set.of("paragraph", "bulletList", "orderedList"), 1);
            }
        }
    }

    private void inlineContent(JsonNode node, ObjectNode result, String path) {
        ArrayNode content = optionalContent(node, path);
        if (content.isEmpty()) {
            return;
        }
        ArrayNode out = result.putArray("content");
        for (JsonNode child : content) {
            String type = nodeType(child, path);
            if ("hardBreak".equals(type)) {
                out.addObject().put("type", "hardBreak");
                continue;
            }
            if (!"text".equals(type)) {
                throw invalid(path, "문단 안에 쓸 수 없는 요소입니다(" + type + ")");
            }
            String text = stringOf(child.get("text"));
            if (text == null || text.isEmpty()) {
                throw invalid(path, "빈 글자 조각은 쓸 수 없습니다");
            }
            if (CONTROL.matcher(text).find()) {
                throw invalid(path, "본문에 제어 문자를 쓸 수 없습니다");
            }
            ObjectNode outText = out.addObject();
            outText.put("type", "text");
            outText.put("text", text);
            ArrayNode marks = marks(child.get("marks"), path);
            if (!marks.isEmpty()) {
                outText.set("marks", marks);
            }
        }
    }

    private ArrayNode marks(JsonNode marks, String path) {
        ArrayNode out = NODES.arrayNode();
        if (marks == null || marks.isNull()) {
            return out;
        }
        if (!marks.isArray()) {
            throw invalid(path, "글자 서식 형식이 올바르지 않습니다");
        }
        Set<String> seen = new LinkedHashSet<>();
        for (JsonNode mark : marks) {
            String type = nodeType(mark, path);
            if (!seen.add(type)) {
                continue;
            }
            if (SIMPLE_MARKS.contains(type)) {
                out.addObject().put("type", type);
            } else if ("link".equals(type)) {
                JsonNode attrs = mark.get("attrs");
                String href = safeHref(attrs == null ? null : stringOf(attrs.get("href")));
                if (href == null) {
                    throw invalid(path, "링크 주소는 https 주소, /로 시작하는 사이트 내부 경로, mailto·tel 만 쓸 수 있습니다");
                }
                ObjectNode link = out.addObject();
                link.put("type", "link");
                link.putObject("attrs").put("href", href);
            } else {
                throw invalid(path, "쓸 수 없는 글자 서식입니다(" + type + ")");
            }
        }
        return out;
    }

    private void align(JsonNode attrs, ObjectNode result) {
        String textAlign = alignOf(attrs);
        if (textAlign != null) {
            result.putObject("attrs").put("textAlign", textAlign);
        }
    }

    private String alignOf(JsonNode attrs) {
        String value = attrs == null ? null : stringOf(attrs.get("textAlign"));
        if (value == null || "left".equals(value)) {
            return null;
        }
        if (!ALIGNS.contains(value)) {
            throw invalid("본문", "정렬 값이 올바르지 않습니다");
        }
        return value;
    }

    // ---- 공용 판정 -----------------------------------------------------------------------------------------------

    private static ArrayNode optionalContent(JsonNode node, String path) {
        JsonNode content = node.get("content");
        if (content == null || content.isNull()) {
            return NODES.arrayNode();
        }
        if (!content.isArray()) {
            throw invalid(path, "본문 형식이 올바르지 않습니다");
        }
        return (ArrayNode) content;
    }

    private static String nodeType(JsonNode node, String path) {
        String type = node == null || !node.isObject() ? null : stringOf(node.get("type"));
        if (type == null) {
            throw invalid(path, "본문 요소의 종류가 없습니다");
        }
        return type;
    }

    private static int boundedInt(JsonNode attrs, String name, int min, int max, String path) {
        JsonNode value = attrs == null ? null : attrs.get(name);
        if (value == null || value.isNull()) {
            return 1;
        }
        if (!value.isIntegralNumber() || value.intValue() < min || value.intValue() > max) {
            throw invalid(path, "표 병합 범위가 올바르지 않습니다");
        }
        return value.intValue();
    }

    private static void object(JsonNode node, String path, Set<String> allowedKeys) {
        if (node == null || !node.isObject()) {
            throw invalid(path, "형식이 올바르지 않습니다");
        }
        for (String key : node.propertyNames()) {
            if (!allowedKeys.contains(key)) {
                throw invalid(path, "알 수 없는 항목입니다(" + key + ")");
            }
        }
    }

    private static ArrayNode array(JsonNode node, String path, int min, int max) {
        if (node == null || !node.isArray() || node.size() < min || node.size() > max) {
            throw invalid(path, min == max ? min + "개여야 합니다" : min + "~" + max + "개여야 합니다");
        }
        return (ArrayNode) node;
    }

    private static String token(JsonNode node, String path, Set<String> allowed) {
        String value = stringOf(node);
        if (value == null || !allowed.contains(value)) {
            throw invalid(path, "허용하지 않는 값입니다");
        }
        return value;
    }

    private static String text(JsonNode node, String path, int max, boolean required) {
        if (node == null || node.isNull()) {
            if (required) {
                throw invalid(path, "값을 입력해 주세요");
            }
            return "";
        }
        String value = stringOf(node);
        if (value == null) {
            throw invalid(path, "글자여야 합니다");
        }
        String stripped = value.strip();
        if (required && stripped.isEmpty()) {
            throw invalid(path, "값을 입력해 주세요");
        }
        if (stripped.length() > max) {
            throw invalid(path, max + "자 이내로 입력해 주세요");
        }
        if (CONTROL.matcher(stripped).find()) {
            throw invalid(path, "제어 문자를 쓸 수 없습니다");
        }
        return stripped;
    }

    private static String stringOf(JsonNode node) {
        return node != null && node.isString() ? node.stringValue() : null;
    }

    private static BusinessException invalid(String path, String message) {
        return new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, path + ": " + message);
    }

    private static final class Context {
        private final Set<Long> images = new LinkedHashSet<>();
        private int blocks;
    }
}

package nuri.migration.appscan;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * JSP 화면에서 입력 필드의 라벨, 목록 표의 머리글과 열 값, 선택 목록의 코드 값과 라벨, 폼·링크의 요청 경로를 찾는다.
 *
 * <ul>
 *   <li>{@code <label for>} 와 같은 행({@code <tr>})의 {@code <th>} 라벨·입력 필드를 순서대로 짝짓는다.</li>
 *   <li>목록 표는 머리글 행의 {@code <th>} 와 다음 행의 {@code ${item.field}} 를 열 순서로 짝짓는다.</li>
 *   <li>{@code <select>}·{@code <form:option>}·라디오의 값과 라벨을 코드 의미 근거로 싣는다. EL 이 들어간 값은 싣지 않는다.</li>
 * </ul>
 */
final class ScreenSourceReader {

    private static final Pattern JSP_COMMENT = Pattern.compile("<%--.*?--%>|<!--.*?-->", Pattern.DOTALL);
    private static final Pattern TAG = Pattern.compile("<[^<>]+>");
    private static final Pattern ATTRIBUTE = Pattern.compile(
            "([A-Za-z_:][A-Za-z0-9_:.-]*)\\s*=\\s*(\"([^\"]*)\"|'([^']*)')");
    private static final Pattern LABEL_FOR = Pattern.compile(
            "(?is)<label\\b([^>]*)>(.*?)</label>");
    private static final Pattern ROW = Pattern.compile("(?is)<tr\\b[^>]*>(.*?)</tr>");
    private static final Pattern HEADER_CELL = Pattern.compile("(?is)<th\\b[^>]*>(.*?)</th>");
    private static final Pattern DATA_CELL = Pattern.compile("(?is)<td\\b[^>]*>(.*?)</td>");
    private static final Pattern FIELD_TAG = Pattern.compile(
            "(?is)<(?:input|select|textarea|form:[A-Za-z]+)\\b[^>]*>");
    private static final Pattern EL_PROPERTY = Pattern.compile("\\$\\{\\s*[A-Za-z_][A-Za-z0-9_]*\\.([A-Za-z_][A-Za-z0-9_]*)\\s*}");
    private static final Pattern TABLE = Pattern.compile("(?is)<table\\b[^>]*>(.*?)</table>");
    private static final Pattern SELECT = Pattern.compile("(?is)<(select|form:select)\\b([^>]*)>(.*?)</\\1>");
    private static final Pattern OPTION = Pattern.compile("(?is)<option\\b([^>]*)>(.*?)</option>");
    private static final Pattern FORM_OPTION = Pattern.compile("(?is)<form:option\\b([^>]*)/?>");
    private static final Pattern RADIO = Pattern.compile(
            "(?is)(<input\\b[^>]*\\btype\\s*=\\s*[\"']?(?:radio|checkbox)[\"']?[^>]*>)\\s*([^<]{1,30})");
    private static final Pattern FORM_ACTION = Pattern.compile("(?is)<form\\b[^>]*>");
    private static final Pattern DO_LINK = Pattern.compile("(?i)[\"']((?:/[A-Za-z0-9_.\\-/]*)?[A-Za-z0-9_\\-]+\\.do)\\b");

    private final UsageCollector collector;

    ScreenSourceReader(UsageCollector collector) {
        this.collector = collector;
    }

    void read(String raw, String path) {
        String text = SourceText.blank(raw, JSP_COMMENT);
        labels(text, path);
        rows(text, path);
        tables(text, path);
        selects(text, path);
        radios(text, path);
        requestPaths(text, path);
    }

    private void labels(String text, String path) {
        Matcher label = LABEL_FOR.matcher(text);
        while (label.find()) {
            String target = attributes(label.group(1)).get("for");
            String caption = plain(label.group(2));
            if (target != null && caption != null) {
                collector.column(target, "SCREEN_LABEL", path, SourceText.lineOf(text, label.start()), null, null, target,
                        null, caption);
            }
        }
    }

    private void rows(String text, String path) {
        Matcher row = ROW.matcher(text);
        while (row.find()) {
            List<String> captions = new ArrayList<>();
            Matcher header = HEADER_CELL.matcher(row.group(1));
            while (header.find()) {
                captions.add(plain(header.group(1)));
            }
            List<String> fields = new ArrayList<>();
            Matcher field = FIELD_TAG.matcher(row.group(1));
            while (field.find()) {
                Map<String, String> attributes = attributes(field.group());
                String type = attributes.getOrDefault("type", "").toLowerCase(Locale.ROOT);
                String name = attributes.getOrDefault("name", attributes.get("path"));
                if (name != null && !type.equals("hidden") && !type.equals("button") && !type.equals("submit")
                        && !type.equals("radio") && !type.equals("checkbox") && !name.contains("${")) {
                    fields.add(name);
                }
            }
            if (fields.isEmpty() || captions.isEmpty()) {
                continue;
            }
            int line = SourceText.lineOf(text, row.start());
            if (captions.size() == fields.size()) {
                for (int index = 0; index < fields.size(); index++) {
                    if (captions.get(index) != null) {
                        collector.column(fields.get(index), "SCREEN_LABEL", path, line, null, null,
                                fields.get(index), null, captions.get(index));
                    }
                }
            } else if (captions.size() == 1 && captions.getFirst() != null) {
                collector.column(fields.getFirst(), "SCREEN_LABEL", path, line, null, null, fields.getFirst(),
                        null, captions.getFirst());
            }
        }
    }

    private void tables(String text, String path) {
        Matcher table = TABLE.matcher(text);
        while (table.find()) {
            List<String> captions = null;
            Matcher row = ROW.matcher(table.group(1));
            while (row.find()) {
                String body = row.group(1);
                if (captions == null) {
                    List<String> headers = new ArrayList<>();
                    Matcher header = HEADER_CELL.matcher(body);
                    while (header.find()) {
                        headers.add(plain(header.group(1)));
                    }
                    if (!headers.isEmpty() && !DATA_CELL.matcher(body).find()) {
                        captions = headers;
                    }
                    continue;
                }
                List<String> properties = new ArrayList<>();
                Matcher cell = DATA_CELL.matcher(body);
                while (cell.find()) {
                    Matcher property = EL_PROPERTY.matcher(cell.group(1));
                    properties.add(property.find() ? property.group(1) : null);
                }
                if (properties.size() == captions.size() && properties.stream().anyMatch(Objects::nonNull)) {
                    int line = SourceText.lineOf(text, table.start(1) + row.start());
                    for (int index = 0; index < properties.size(); index++) {
                        if (properties.get(index) != null && captions.get(index) != null) {
                            collector.column(properties.get(index), "LIST_COLUMN_LABEL", path, line, null, null,
                                    properties.get(index), null, captions.get(index));
                        }
                    }
                    break;
                }
            }
        }
    }

    private void selects(String text, String path) {
        Matcher select = SELECT.matcher(text);
        while (select.find()) {
            Map<String, String> attributes = attributes(select.group(2));
            String name = attributes.getOrDefault("name", attributes.get("path"));
            if (name == null || name.contains("${")) {
                continue;
            }
            Matcher option = OPTION.matcher(select.group(3));
            while (option.find()) {
                option(name, attributes(option.group(1)).get("value"), plain(option.group(2)), path,
                        SourceText.lineOf(text, select.start(3) + option.start()));
            }
            Matcher formOption = FORM_OPTION.matcher(select.group(3));
            while (formOption.find()) {
                Map<String, String> optionAttributes = attributes(formOption.group(1));
                option(name, optionAttributes.get("value"), optionAttributes.get("label"), path,
                        SourceText.lineOf(text, select.start(3) + formOption.start()));
            }
        }
    }

    private void radios(String text, String path) {
        Matcher radio = RADIO.matcher(text);
        while (radio.find()) {
            Map<String, String> attributes = attributes(radio.group(1));
            String name = attributes.get("name");
            if (name != null && !name.contains("${")) {
                option(name, attributes.get("value"), plain(radio.group(2)), path, SourceText.lineOf(text, radio.start()));
            }
        }
    }

    private void option(String field, String value, String label, String path, int line) {
        if (value == null || value.isEmpty() || value.contains("${") || value.length() > 20 || label == null) {
            return;
        }
        collector.column(field, "SELECT_OPTION", path, line, null, null, field, value, label);
    }

    private void requestPaths(String text, String path) {
        Matcher form = FORM_ACTION.matcher(text);
        while (form.find()) {
            String action = attributes(form.group()).get("action");
            if (action != null && !action.isBlank() && !action.contains("${")) {
                collector.requestPath(path, SourceText.lineOf(text, form.start()), action.strip(), "JSP_FORM_ACTION");
            }
        }
        Matcher link = DO_LINK.matcher(text);
        while (link.find()) {
            collector.requestPath(path, SourceText.lineOf(text, link.start()), link.group(1), "JSP_DO_LINK");
        }
    }

    private static Map<String, String> attributes(String tag) {
        Map<String, String> attributes = new HashMap<>();
        Matcher attribute = ATTRIBUTE.matcher(tag);
        while (attribute.find()) {
            String value = attribute.group(3) != null ? attribute.group(3) : attribute.group(4);
            attributes.putIfAbsent(attribute.group(1).toLowerCase(Locale.ROOT), value);
        }
        return attributes;
    }

    /** 태그와 EL·스크립틀릿을 걷어 낸 글자. 남는 글자가 없거나 40자를 넘으면 라벨로 보지 않는다. */
    private static String plain(String html) {
        String text = TAG.matcher(html.replaceAll("(?s)<%.*?%>", " ").replaceAll("\\$\\{[^}]*}", " "))
                .replaceAll(" ").replace("&nbsp;", " ").replaceAll("\\s+", " ").strip();
        return text.isEmpty() || text.length() > 40 ? null : text;
    }
}

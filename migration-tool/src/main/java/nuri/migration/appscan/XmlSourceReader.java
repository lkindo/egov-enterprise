package nuri.migration.appscan;

import javax.xml.XMLConstants;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.StringReader;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * XML 소스를 읽는다. MyBatis {@code <mapper>}·iBATIS {@code <sqlMap>} 이면 SQL 문과 resultMap 을, Spring Security
 * 설정이면 {@code <intercept-url>} 의 경로·접근 규칙만 읽는다. 그 밖의 XML(데이터소스 설정 등)은 내용을 싣지 않는다.
 *
 * <p>외부 DTD·엔티티는 불러오지 않는다. iBATIS 매퍼처럼 DOCTYPE 이 있는 문서도 읽어야 해서 DOCTYPE 자체는 허용하되
 * 외부 접근을 모두 끈다.</p>
 */
final class XmlSourceReader {

    /** 이 이름의 하위 요소가 SQL 문 안에 있으면 조건에 따라 SQL 이 달라진다. */
    private static final Set<String> STATIC_CHILDREN = Set.of("include", "selectkey");
    private static final Set<String> STATEMENTS = Set.of(
            "select", "insert", "update", "delete", "sql", "statement", "procedure");
    private static final Pattern SUBSTITUTION = Pattern.compile("\\$\\{|\\$[A-Za-z_][A-Za-z0-9_.]*\\$");

    enum Kind { SQL_MAPPER, SECURITY, OTHER }

    private final UsageCollector collector;
    private final SqlUsageExtractor sql;

    XmlSourceReader(UsageCollector collector) {
        this.collector = collector;
        this.sql = new SqlUsageExtractor(collector);
    }

    /** 문서를 읽고 종류를 돌려준다. 해석하지 못하면 {@code PARTIAL} 로 남기고 {@link Kind#OTHER} 다. */
    Kind read(String text, String path) {
        try {
            XMLStreamReader reader = factory().createXMLStreamReader(new StringReader(text));
            try {
                return read(reader, path);
            } finally {
                reader.close();
            }
        } catch (XMLStreamException | RuntimeException failure) {
            collector.partial(path, "UNPARSEABLE_XML");
            return Kind.OTHER;
        }
    }

    private Kind read(XMLStreamReader reader, String path) throws XMLStreamException {
        Kind kind = null;
        String resultType = null;
        while (reader.hasNext()) {
            int event = reader.next();
            if (event != XMLStreamConstants.START_ELEMENT) {
                continue;
            }
            String name = reader.getLocalName().toLowerCase(Locale.ROOT);
            if (kind == null) {
                kind = name.equals("mapper") || name.equals("sqlmap") ? Kind.SQL_MAPPER : Kind.OTHER;
            }
            if (name.equals("intercept-url")) {
                kind = kind == Kind.SQL_MAPPER ? kind : Kind.SECURITY;
                collector.accessRule(path, reader.getLocation().getLineNumber(),
                        attribute(reader, "pattern"), attribute(reader, "access"));
                continue;
            }
            if (kind != Kind.SQL_MAPPER) {
                continue;
            }
            if (name.equals("resultmap")) {
                resultType = attribute(reader, "type");
                if (resultType == null) {
                    resultType = attribute(reader, "class");
                }
            } else if (name.equals("result") || name.equals("id")) {
                String column = attribute(reader, "column");
                String property = attribute(reader, "property");
                if (column != null && property != null) {
                    collector.column(column, "RESULT_MAP", path, reader.getLocation().getLineNumber(), null,
                            simpleName(resultType), property, null, null);
                }
            } else if (STATEMENTS.contains(name)) {
                statement(reader, path);
            }
        }
        return kind == null ? Kind.OTHER : kind;
    }

    private void statement(XMLStreamReader reader, String path) throws XMLStreamException {
        int line = reader.getLocation().getLineNumber();
        StringBuilder text = new StringBuilder();
        boolean dynamic = false;
        int depth = 1;
        while (reader.hasNext() && depth > 0) {
            int event = reader.next();
            switch (event) {
                case XMLStreamConstants.START_ELEMENT -> {
                    depth++;
                    if (!STATIC_CHILDREN.contains(reader.getLocalName().toLowerCase(Locale.ROOT))) {
                        dynamic = true;
                    }
                    text.append(' ');
                }
                case XMLStreamConstants.END_ELEMENT -> {
                    depth--;
                    text.append(' ');
                }
                case XMLStreamConstants.CHARACTERS, XMLStreamConstants.CDATA, XMLStreamConstants.SPACE ->
                        text.append(reader.getText());
                default -> {
                    // 주석·처리 명령은 SQL 이 아니다.
                }
            }
        }
        String statement = text.toString();
        if (dynamic) {
            collector.partial(path, "DYNAMIC_SQL");
        }
        if (SUBSTITUTION.matcher(statement).find()) {
            collector.partial(path, "SQL_TEXT_SUBSTITUTION");
        }
        sql.extract(statement, path, line);
    }

    private static String attribute(XMLStreamReader reader, String name) {
        for (int index = 0; index < reader.getAttributeCount(); index++) {
            if (reader.getAttributeLocalName(index).equalsIgnoreCase(name)) {
                return reader.getAttributeValue(index);
            }
        }
        return null;
    }

    private static String simpleName(String type) {
        if (type == null) {
            return null;
        }
        int dot = type.lastIndexOf('.');
        return dot >= 0 ? type.substring(dot + 1) : type;
    }

    private static XMLInputFactory factory() {
        XMLInputFactory factory = XMLInputFactory.newFactory();
        // 매퍼의 DOCTYPE 은 외부 DTD 를 가리킨다. DTD 를 처리하지 않아 그 주소에 접근하지 않는다.
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        factory.setProperty(XMLInputFactory.IS_REPLACING_ENTITY_REFERENCES, false);
        factory.setProperty(XMLInputFactory.IS_NAMESPACE_AWARE, false);
        factory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        return factory;
    }
}

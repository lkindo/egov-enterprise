package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 영속 엔티티의 SOURCE-retention Lombok 애노테이션 게이트 — 백엔드 헌법 제3조 3항 (a).
 *
 * <p>{@code @Builder}, {@code @SuperBuilder}, {@code @AllArgsConstructor}는 바이트코드에 남지 않아
 * ArchUnit으로 검사할 수 없다. 따라서 두 비즈니스 모듈의 Java 원문에서 {@code @Entity} 선언의
 * <em>클래스 직속</em> 애노테이션만 판정한다. 메서드·정적 팩토리의 {@code @Builder}, 비-엔티티
 * ID/DTO의 Lombok 애노테이션, 주석·문자열의 예시는 허용한다.
 */
@Tag("governance-harness")
class EntityLombokSourceLinterTest {

    private static final List<String> ENTITY_SOURCE_ROOTS = List.of(
            "business-core/src/main/java",
            "business-app/src/main/java");
    private static final Set<String> FORBIDDEN_CLASS_ANNOTATIONS = Set.of(
            "AllArgsConstructor", "Builder", "SuperBuilder");
    private static final Map<String, Integer> ENTITY_COUNT_FLOORS = Map.of(
            "total", 70,
            "perRoot", 20);

    @Test
    @DisplayName("@Entity 클래스는 class-level @AllArgsConstructor/@Builder/@SuperBuilder를 사용하지 않는다")
    void entityClassesMustNotUseForbiddenClassLevelLombokAnnotations() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        Map<String, Integer> countsByRoot = new HashMap<>();

        for (String relativeRoot : ENTITY_SOURCE_ROOTS) {
            Path sourceRoot = repoRoot.resolve(relativeRoot);
            if (!Files.isDirectory(sourceRoot)) {
                fail("게이트 무결성 파손: 엔티티 소스 루트가 없습니다 — " + relativeRoot);
            }
            int count = 0;
            for (Path source : HarnessSourceIndex.javaSources(sourceRoot).stream().sorted().toList()) {
                SourceAudit audit = auditSource(HarnessSourceIndex.read(source));
                count += audit.entityCount();
                String displayPath = repoRoot.relativize(source).toString().replace('\\', '/');
                for (Violation violation : audit.violations()) {
                    violations.add(displayPath + ":" + violation.line() + " " + violation.entityName()
                            + " — class-level @" + violation.annotation());
                }
            }
            countsByRoot.put(relativeRoot, count);
            if (count < ENTITY_COUNT_FLOORS.get("perRoot")) {
                fail("게이트 무결성 파손: " + relativeRoot + " @Entity 스캔 " + count
                        + "건 — 하한(" + ENTITY_COUNT_FLOORS.get("perRoot") + ") 미만으로 vacuous 통과 위험");
            }
        }

        int totalEntities = countsByRoot.values().stream().mapToInt(Integer::intValue).sum();
        if (totalEntities < ENTITY_COUNT_FLOORS.get("total")) {
            fail("게이트 무결성 파손: 전체 @Entity 스캔 " + totalEntities
                    + "건 — 하한(" + ENTITY_COUNT_FLOORS.get("total") + ") 미만, roots=" + countsByRoot);
        }
        if (!violations.isEmpty()) {
            fail("백엔드 헌법 제3조 3항 (a) 위반 — 엔티티 클래스의 Lombok 생성자/빌더 금지:\n - "
                    + String.join("\n - ", violations)
                    + "\n정적 create(...) 메서드의 @Builder와 명시적 non-public 생성자를 사용하십시오."
                    + "\n스캔=" + countsByRoot);
        }
    }

    @Test
    @DisplayName("SOURCE 파서는 주석·문자열·메서드 Builder와 비-Entity 중첩 타입을 오탐하지 않는다")
    void parserOnlyReportsAnnotationsDirectlyAttachedToEntityClass() {
        String safe = """
                // @Entity @AllArgsConstructor class CommentDecoy {}
                @Entity(name = "Safe")
                @Table(indexes = {@Index(name = "@Builder", columnList = "id")})
                class SafeEntity {
                    String annotationText = "@SuperBuilder class StringDecoy {}";

                    @Builder
                    static SafeEntity create() { return new SafeEntity(); }

                    @AllArgsConstructor
                    @Builder
                    static class SafeId {}
                }
                """;
        SourceAudit safeAudit = auditSource(safe);
        assertEquals(1, safeAudit.entityCount());
        assertTrue(safeAudit.violations().isEmpty(), () -> "허용 위치 오탐: " + safeAudit.violations());

        String forbidden = """
                @jakarta.persistence.Entity
                @lombok.AllArgsConstructor
                @lombok.Builder
                @lombok.experimental.SuperBuilder(toBuilder = true)
                public class BrokenEntity {}
                """;
        SourceAudit forbiddenAudit = auditSource(forbidden);
        assertEquals(1, forbiddenAudit.entityCount());
        assertEquals(Set.of("AllArgsConstructor", "Builder", "SuperBuilder"),
                forbiddenAudit.violations().stream()
                        .map(Violation::annotation)
                        .collect(java.util.stream.Collectors.toSet()));
    }

    static SourceAudit auditSource(String source) {
        String code = maskCommentsAndLiterals(source);
        Map<Integer, Integer> boundaryByDepth = new HashMap<>();
        boundaryByDepth.put(0, 0);
        List<Violation> violations = new ArrayList<>();
        int entities = 0;
        int curlyDepth = 0;
        int parenDepth = 0;
        int bracketDepth = 0;

        for (int i = 0; i < code.length(); i++) {
            if (isTypeKeywordAt(code, i)) {
                int prefixStart = boundaryByDepth.getOrDefault(curlyDepth, 0);
                Set<String> annotations = topLevelAnnotations(code.substring(prefixStart, i));
                if (annotations.contains("Entity")) {
                    entities++;
                    String entityName = typeNameAfterKeyword(code, i);
                    int line = 1 + (int) code.substring(0, i).chars().filter(ch -> ch == '\n').count();
                    for (String forbidden : new TreeSet<>(FORBIDDEN_CLASS_ANNOTATIONS)) {
                        if (annotations.contains(forbidden)) {
                            violations.add(new Violation(entityName, forbidden, line));
                        }
                    }
                }
            }

            char current = code.charAt(i);
            if (current == '(') {
                parenDepth++;
            } else if (current == ')') {
                parenDepth = Math.max(0, parenDepth - 1);
            } else if (current == '[') {
                bracketDepth++;
            } else if (current == ']') {
                bracketDepth = Math.max(0, bracketDepth - 1);
            } else if (parenDepth == 0 && bracketDepth == 0 && current == '{') {
                curlyDepth++;
                boundaryByDepth.put(curlyDepth, i + 1);
            } else if (parenDepth == 0 && bracketDepth == 0 && current == '}') {
                boundaryByDepth.remove(curlyDepth);
                curlyDepth = Math.max(0, curlyDepth - 1);
                boundaryByDepth.put(curlyDepth, i + 1);
            } else if (parenDepth == 0 && bracketDepth == 0 && current == ';') {
                boundaryByDepth.put(curlyDepth, i + 1);
            }
        }
        return new SourceAudit(entities, List.copyOf(violations));
    }

    private static boolean isTypeKeywordAt(String source, int index) {
        for (String keyword : List.of("class", "record", "enum")) {
            if (!source.startsWith(keyword, index)) {
                continue;
            }
            int before = index - 1;
            int after = index + keyword.length();
            boolean leftBoundary = before < 0 || !Character.isJavaIdentifierPart(source.charAt(before));
            boolean rightBoundary = after >= source.length()
                    || !Character.isJavaIdentifierPart(source.charAt(after));
            if (!leftBoundary || !rightBoundary) {
                continue;
            }
            while (before >= 0 && Character.isWhitespace(source.charAt(before))) {
                before--;
            }
            return before < 0 || source.charAt(before) != '.';
        }
        return false;
    }

    private static String typeNameAfterKeyword(String source, int keywordStart) {
        int cursor = keywordStart;
        while (cursor < source.length() && Character.isJavaIdentifierPart(source.charAt(cursor))) {
            cursor++;
        }
        while (cursor < source.length() && Character.isWhitespace(source.charAt(cursor))) {
            cursor++;
        }
        int start = cursor;
        while (cursor < source.length() && Character.isJavaIdentifierPart(source.charAt(cursor))) {
            cursor++;
        }
        return start == cursor ? "<unknown>" : source.substring(start, cursor);
    }

    private static Set<String> topLevelAnnotations(String prefix) {
        Set<String> annotations = new LinkedHashSet<>();
        int parens = 0;
        int brackets = 0;
        for (int i = 0; i < prefix.length(); i++) {
            char current = prefix.charAt(i);
            if (current == '(') {
                parens++;
            } else if (current == ')') {
                parens = Math.max(0, parens - 1);
            } else if (current == '[') {
                brackets++;
            } else if (current == ']') {
                brackets = Math.max(0, brackets - 1);
            } else if (current == '@' && parens == 0 && brackets == 0) {
                int cursor = i + 1;
                while (cursor < prefix.length() && Character.isWhitespace(prefix.charAt(cursor))) {
                    cursor++;
                }
                int start = cursor;
                while (cursor < prefix.length()
                        && (Character.isJavaIdentifierPart(prefix.charAt(cursor)) || prefix.charAt(cursor) == '.')) {
                    cursor++;
                }
                if (cursor > start) {
                    String qualified = prefix.substring(start, cursor);
                    annotations.add(qualified.substring(qualified.lastIndexOf('.') + 1));
                    i = cursor - 1;
                }
            }
        }
        return annotations;
    }

    private static String maskCommentsAndLiterals(String source) {
        StringBuilder masked = new StringBuilder(source.length());
        for (int i = 0; i < source.length();) {
            if (source.startsWith("//", i)) {
                i = maskUntilLineEnd(source, i, masked);
            } else if (source.startsWith("/*", i)) {
                i = maskUntil(source, i, "*/", masked);
            } else if (source.startsWith("\"\"\"", i)) {
                i = maskUntil(source, i, "\"\"\"", masked, 3);
            } else if (source.charAt(i) == '"' || source.charAt(i) == '\'') {
                i = maskQuoted(source, i, masked, source.charAt(i));
            } else {
                masked.append(source.charAt(i));
                i++;
            }
        }
        return masked.toString();
    }

    private static int maskUntilLineEnd(String source, int index, StringBuilder masked) {
        while (index < source.length() && source.charAt(index) != '\n') {
            masked.append(' ');
            index++;
        }
        return index;
    }

    private static int maskUntil(String source, int index, String terminator, StringBuilder masked) {
        return maskUntil(source, index, terminator, masked, terminator.length());
    }

    private static int maskUntil(String source, int index, String terminator, StringBuilder masked, int searchOffset) {
        int close = source.indexOf(terminator, index + searchOffset);
        int end = close < 0 ? source.length() : close + terminator.length();
        while (index < end) {
            masked.append(source.charAt(index) == '\n' ? '\n' : ' ');
            index++;
        }
        return index;
    }

    private static int maskQuoted(String source, int index, StringBuilder masked, char quote) {
        masked.append(' ');
        index++;
        while (index < source.length()) {
            char current = source.charAt(index);
            masked.append(current == '\n' ? '\n' : ' ');
            index++;
            if (current == '\\' && index < source.length()) {
                masked.append(source.charAt(index) == '\n' ? '\n' : ' ');
                index++;
            } else if (current == quote) {
                break;
            }
        }
        return index;
    }

    record SourceAudit(int entityCount, List<Violation> violations) {}

    record Violation(String entityName, String annotation, int line) {}
}

package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧨 QueryDSL 동적 경로(dynamic path) 구성 차단 게이트 — HQL 인젝션(CVE-2024-49203) 재유입 방지.
 *
 * <p>[근거] CVE-2024-49203(CVSS 8.2)은 {@code orderBy} 를 통한 blind HQL 인젝션이다. 성립 조건은
 * <b>사용자 입력 문자열을 경로(path)로 승격</b>시키는 것 — 전형적으로 다음 형태다.
 * <pre>
 *   PathBuilder&lt;T&gt; pb = new PathBuilder&lt;&gt;(T.class, "t");
 *   OrderSpecifier&lt;?&gt; o = new OrderSpecifier(Order.ASC, pb.get(userInput));   // ← 여기
 * </pre>
 * QueryDSL 은 이 문자열을 식별자로 그대로 엮으므로 파라미터 바인딩이 개입하지 않는다.
 *
 * <p>[왜 버전 상향만으로 끝내지 않는가] 이 저장소는 2026-08-07 에 원본 {@code com.querydsl}(5.1.0 이
 * 마지막 릴리스, 패치 없음)에서 유지보수 포크 {@code io.github.openfeign.querydsl:5.6.1}(같은
 * advisory 패치 반영)로 이관했다. 그러나 <b>라이브러리 상향은 이 코드 패턴을 막지 않는다</b> —
 * 동적 경로 구성은 API 로 여전히 가능하고, 포크의 수정은 특정 표현식 처리에 한정된다.
 *
 * <p>더 중요한 이유가 있다. 이관 판단의 근거였던 <b>"이 저장소에는 취약 패턴이 없다"</b>는 명제는
 * 그 시점의 <b>관측</b>일 뿐이었고, 재발 방지책은 문서에 적은
 * <i>"QueryDSL 로 정렬을 추가할 때 재확인할 것"</i> 한 줄뿐이었다.
 * AGENTS.md Evidence guardrails H5가 못박은 대로 <b>prose 로만 존재하는 규칙은 그 규칙을 어길 주체를 막지 못한다</b>.
 * 이 게이트는 그 관측을 강제로 바꾼다.
 *
 * <p>[규칙] 생산 코드({@code src/main/java})에서 다음을 금지한다.
 * <ol>
 *   <li>{@code PathBuilder} 의 <b>임의 사용</b> — 타입 안전한 Q-클래스({@code QBoard.board.crtDt})가
 *       있는데 굳이 문자열 기반 경로 빌더를 쓸 이유가 없다. 쓰는 순간 문자열이 식별자가 되는 문이 열린다.</li>
 *   <li>{@code Expressions.stringPath(...)} 등 <b>경로 팩토리에 상수가 아닌 인자</b>를 넘기는 것.
 *       리터럴 인자({@code Expressions.stringPath("crtDt")})는 허용한다 — 그건 사용자 입력이 아니다.</li>
 * </ol>
 *
 * <p>[정렬을 동적으로 받아야 한다면] 화이트리스트 {@code switch}/{@code Map} 으로 <b>사용자 문자열을
 * 컴파일타임 Q-클래스 경로에 매핑</b>하라. 현행
 * {@code BoardRepositoryImpl#searchArticles} 가 그 형태이며, 이 게이트를 통과하는 유일한 방식이다.
 *
 * <p>[예외 목록 없음] 도입 시점 위반 0건이다. 예외 목록으로 출발하면 그 목록이 곧 서랍이 된다(AGENTS.md Evidence guardrails H2).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 텍스트 스캔.
 */
@Tag("governance-harness")
class QuerydslDynamicPathLinterTest {

    private static final Logger log = LoggerFactory.getLogger(QuerydslDynamicPathLinterTest.class);

    private static final String[] MODULES = {"foundation", "business-core", "business-app", "api-server"};

    /**
     * {@code PathBuilder} 의 등장. import·선언·생성 어느 형태든 잡는다.
     * <p>주석 안의 언급까지 잡으면 오탐이므로 줄 단위로 주석을 먼저 걷어낸 뒤 매칭한다.
     */
    private static final Pattern PATH_BUILDER = Pattern.compile("\\bPathBuilder\\b");

    /**
     * {@code Expressions.xxxPath(인자)} 의 인자를 뽑는다.
     * {@code stringPath}·{@code numberPath}·{@code datePath}·{@code path} 등 Path 팩토리 전반.
     */
    private static final Pattern EXPRESSIONS_PATH =
            Pattern.compile("\\bExpressions\\s*\\.\\s*\\w*[Pp]ath\\s*\\(([^)]*)\\)");

    /** 문자열 리터럴만으로 이루어진 인자인가(마지막 인자 기준). 리터럴은 사용자 입력이 아니다. */
    private static final Pattern LITERAL_LAST_ARG = Pattern.compile(".*\"[^\"]*\"\\s*$");

    @Test
    @DisplayName("🧨 QueryDSL 경로를 문자열로 동적 구성하지 않는가 — HQL 인젝션(CVE-2024-49203) 차단")
    void auditDynamicPathConstruction() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        int scanned = 0;

        for (Path f : HarnessSourceIndex.productionJavaSources(MODULES)) {
            scanned++;
            String src = stripComments(HarnessSourceIndex.read(f));
            String rel = root.relativize(f).toString().replace('\\', '/');

            if (PATH_BUILDER.matcher(src).find()) {
                violations.add(rel + " — PathBuilder 사용. 문자열이 식별자가 되는 경로다. "
                        + "Q-클래스 경로를 직접 쓰거나, 사용자 입력은 화이트리스트로 Q-클래스에 매핑하라.");
            }

            Matcher m = EXPRESSIONS_PATH.matcher(src);
            while (m.find()) {
                String args = m.group(1).trim();
                if (args.isEmpty() || LITERAL_LAST_ARG.matcher(args).matches()) {
                    continue;   // 리터럴 경로명은 사용자 입력이 아니다
                }
                violations.add(rel + " — Expressions 경로 팩토리에 비(非)리터럴 인자: `" + args + "`. "
                        + "변수를 경로명으로 넘기면 그 값이 식별자로 엮인다.");
            }
        }

        log.info("[QuerydslDynamicPathLinter] 생산 소스 {}개 스캔, 위반 {}건", scanned, violations.size());

        // 스캔 대상이 0이면 게이트가 vacuous 하게 통과한다 — 그 자체를 실패로 본다.
        if (scanned == 0) {
            fail("생산 소스를 하나도 스캔하지 못했다 — 게이트가 무의미하게 통과하고 있다. 경로 해석을 확인하라.");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("QueryDSL 동적 경로 구성 ").append(violations.size()).append("건 — ");
            sb.append("HQL 인젝션(CVE-2024-49203) 성립 조건이다.\n");
            violations.forEach(v -> sb.append("  · ").append(v).append('\n'));
            sb.append("\n올바른 형태: 사용자 입력을 화이트리스트 switch/Map 으로 컴파일타임 Q-클래스 경로에 매핑한다.\n");
            sb.append("  예) BoardRepositoryImpl#searchArticles — condition.getOrderBy() 를 switch 로 매핑\n");
            fail(sb.toString());
        }
    }

    /**
     * 줄 주석과 블록 주석을 제거한다. 주석에 적힌 {@code PathBuilder} 언급까지 위반으로 세면
     * <b>이 클래스의 javadoc 자체가 위반</b>이 되는 자기모순이 생긴다(도입 시 실측으로 확인).
     */
    private static String stripComments(String src) {
        String noBlock = src.replaceAll("(?s)/\\*.*?\\*/", " ");
        return noBlock.replaceAll("(?m)//.*$", " ");
    }

}

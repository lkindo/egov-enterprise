package nuri.migration.appscan;

import java.util.List;
import java.util.Objects;

/**
 * {@code app-scan} 산출물의 본문이다(ADR-0029 결정 9). 레거시 소스에서 정적으로 보이는 컬럼 사용처를 모은다.
 *
 * <ul>
 *   <li>{@code status} 는 {@code COMPLETE} 또는 {@code PARTIAL} 이다. 동적 SQL·해석하지 못한 파일·압축본·소스 없는
 *       빌드 산출물이 있으면 {@code PARTIAL} 이고 {@code partialFiles} 가 이유를 말한다.</li>
 *   <li>사용처가 보이지 않는 컬럼을 판정하지 않는다 — "사용처 없음" 은 미사용의 증거가 아니다(결정 2).</li>
 *   <li>설정 파일(properties·yml 등)은 내용을 읽지 않는다. 값·라벨은 개인정보로 보이는 부분을 가리고, 자격처럼 보이는
 *       항목은 싣지 않고 {@code droppedSensitive} 로 센다.</li>
 *   <li>경로는 스캔 루트 아래 상대 경로({@code /} 구분)다. 루트의 실제 위치는 싣지 않는다.</li>
 * </ul>
 */
public record AppUsageReport(
        int scanVersion,
        String status,
        FileCounts files,
        List<PartialFile> partialFiles,
        List<ColumnUsage> columns,
        List<TableReference> tables,
        List<CodeConstant> codeConstants,
        List<RequestPath> requestPaths,
        List<AccessRule> accessRules,
        long droppedSensitive) {

    public static final int CURRENT_VERSION = 1;

    public AppUsageReport {
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(files, "files");
        partialFiles = List.copyOf(partialFiles);
        columns = List.copyOf(columns);
        tables = List.copyOf(tables);
        codeConstants = List.copyOf(codeConstants);
        requestPaths = List.copyOf(requestPaths);
        accessRules = List.copyOf(accessRules);
    }

    /** 종류별 파일 수. {@code configNotRead} 는 내용을 읽지 않은 설정 파일이다. */
    public record FileCounts(long scanned, long sqlMappers, long sqlScripts, long javaSources, long screens,
                             long xmlOther, long configNotRead, long binaries, long archives, long symlinksSkipped,
                             long other) {}

    /** 정적으로 다 보지 못한 파일과 이유. */
    public record PartialFile(String path, String reason) {

        public PartialFile {
            Objects.requireNonNull(path, "path");
            Objects.requireNonNull(reason, "reason");
        }
    }

    /** 컬럼 하나(대문자 스네이크 표기)의 사용처. */
    public record ColumnUsage(String column, List<UsageEvidence> usages) {

        public ColumnUsage {
            Objects.requireNonNull(column, "column");
            usages = List.copyOf(usages);
        }
    }

    /**
     * 사용처 한 건. {@code kind} 는 {@code SQL_SELECT_ALIAS}·{@code SQL_JOIN}·{@code SQL_LITERAL}·{@code SQL_CASE}·
     * {@code SQL_CURRENT_TIME}·{@code SQL_BINDING}·{@code RESULT_MAP}·{@code VO_FIELD}·{@code SCREEN_LABEL}·
     * {@code LIST_COLUMN_LABEL}·{@code SELECT_OPTION} 중 하나다. {@code table} 은 SQL 에서 정할 수 있을 때만 있다.
     */
    public record UsageEvidence(String kind, String path, int line, String table, String owner, String detail,
                                String value, String label) {

        public UsageEvidence {
            Objects.requireNonNull(kind, "kind");
            Objects.requireNonNull(path, "path");
        }
    }

    /** SQL 이 참조한 테이블과 그 파일들. */
    public record TableReference(String table, List<String> paths) {

        public TableReference {
            Objects.requireNonNull(table, "table");
            paths = List.copyOf(paths);
        }
    }

    /** 코드 상수·enum 상수. 이름이 자격처럼 보이면 값은 싣지 않는다. */
    public record CodeConstant(String path, int line, String owner, String name, String value, String kind) {}

    /** 화면·컨트롤러가 가리키는 요청 경로. */
    public record RequestPath(String path, int line, String requestPath, String source) {}

    /** 보안 설정의 경로별 접근 규칙. */
    public record AccessRule(String path, int line, String pattern, String access) {}
}

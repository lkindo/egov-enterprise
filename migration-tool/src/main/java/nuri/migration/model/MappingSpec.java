package nuri.migration.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * {@code mapping.yml} 바인딩 모델 — 레거시 소스 → 표준 스키마 이관 선언(진실원천).
 *
 * <p>설계: {@code docs/02-architecture/legacy-migration-tool-design.md} (Phase 4a).
 * 소스/타깃 접속과 테이블·컬럼 매핑, 코드값 매핑을 선언적으로 표현한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MappingSpec(
        DbConfig source,
        DbConfig target,
        List<TableMapping> tables,
        Map<String, Map<String, String>> codemaps
) {

    public MappingSpec {
        tables = tables == null ? List.of() : tables;
        codemaps = codemaps == null ? Map.of() : codemaps;
    }

    /** JDBC 접속 정보(소스/타깃 공통). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DbConfig(String url, String username, String password, String driver) {}

    /** 소스 테이블 → 타깃 테이블 매핑. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TableMapping(
            String source,
            String target,
            String where,
            List<ColumnMapping> columns,
            IdStrategy idStrategy
    ) {
        public TableMapping {
            columns = columns == null ? List.of() : columns;
        }
    }

    /**
     * 컬럼 매핑. {@code source} 없이 {@code constant} 만 있으면 상수 주입(표준 감사컬럼 등).
     * {@code transform}(변환기명)·{@code codemap}(코드맵명)·{@code type}(타입변환 힌트)은 선택.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ColumnMapping(
            String source,
            String target,
            String transform,
            String type,
            String codemap,
            @JsonProperty("const") String constant
    ) {}

    /** 표준 ID 생성 전략(생성기 prefix 연동). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record IdStrategy(String column, String generator) {}
}

package nuri.migration.protect;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

import nuri.migration.model.MappingSpec;

/**
 * 행 체크섬에 넣을 보호 컬럼 값을 고른다(2026-11-21).
 *
 * <p>{@code rrno-aes-gcm-v2} 는 암호화마다 nonce 가 달라 같은 원천 행을 다시 적재하면 암호문이 달라진다. 체크섬이 암호문을
 * 그대로 담으면 재개·재실행이 커밋된 행마다 {@code resume checkpoint/source checksum 불일치} 로 멈췄다. 적재(checkpoint)와
 * 검증(대상 재조회)이 같은 규칙을 쓰도록, 그런 컬럼의 값은 평문을 키로 지문한 결정적 표지로 바꿔 체크섬에 넣는다. 결정적
 * 암호({@code aria-egov-v1})는 암호문 그대로라 종전 checkpoint 와 같은 체크섬이다.
 *
 * <p>무작위 nonce 컬럼이 없는 실행은 키를 요구하지 않는다. 있으면 그 키링만 요구한다 — 검증은 적재와 같은 프로세스·환경에서 돈다.
 */
public final class ProtectedRowChecksum {

    private static final ProtectedRowChecksum NONE = new ProtectedRowChecksum(Map.of());

    /** 대상 테이블(스키마 없는 소문자) → 무작위 nonce 컬럼(소문자) → 그 컬럼의 암호기. */
    private final Map<String, Map<String, ColumnCipher>> randomized;

    private ProtectedRowChecksum(Map<String, Map<String, ColumnCipher>> randomized) {
        this.randomized = Map.copyOf(randomized);
    }

    public static ProtectedRowChecksum none() {
        return NONE;
    }

    /** 적재 실행의 보호기가 이미 만든 암호기에서 무작위 nonce 컬럼만 고른다. */
    static ProtectedRowChecksum of(Map<String, ColumnProtectionPlan.ProtectedColumn> columns,
                                   Map<ColumnProtection, ColumnCipher> ciphers) {
        Map<String, Map<String, ColumnCipher>> byTable = new HashMap<>();
        for (ColumnProtectionPlan.ProtectedColumn column : columns.values()) {
            ColumnCipher cipher = ciphers.get(column.protection());
            if (cipher != null && cipher.randomized()) {
                byTable.computeIfAbsent(ProtectedTargetColumns.unqualified(column.targetTable()),
                        ignored -> new HashMap<>()).put(column.column().toLowerCase(Locale.ROOT), cipher);
            }
        }
        return byTable.isEmpty() ? NONE : new ProtectedRowChecksum(byTable);
    }

    public static ProtectedRowChecksum forRun(MappingSpec spec, Function<String, String> environment) {
        Objects.requireNonNull(environment, "environment");
        if (spec == null) {
            return NONE;
        }
        Map<String, ColumnProtectionPlan.ProtectedColumn> columns = ColumnProtectionPlan.of(spec).columns();
        if (columns.values().stream().noneMatch(column -> column.protection() == ColumnProtection.RRNO_AES_GCM_V2)) {
            return NONE;
        }
        String activeKeyId = environment.apply(ColumnProtector.RRNO_ACTIVE_KEY_ID_ENVIRONMENT);
        String keysJson = environment.apply(ColumnProtector.RRNO_KEYS_JSON_ENVIRONMENT);
        if (activeKeyId == null || activeKeyId.isBlank() || keysJson == null || keysJson.isBlank()) {
            throw new IllegalStateException("보호 컬럼 RRNO v2 키링이 없습니다 — 환경 변수 "
                    + ColumnProtector.RRNO_ACTIVE_KEY_ID_ENVIRONMENT + ", " + ColumnProtector.RRNO_KEYS_JSON_ENVIRONMENT
                    + " 에 온라인 앱 키링 값을 주입하세요");
        }
        return of(columns, Map.of(ColumnProtection.RRNO_AES_GCM_V2, new RrnoAesGcmColumnCipher(activeKeyId, keysJson)));
    }

    /** 체크섬에 넣을 행. 바꿀 컬럼이 없으면 받은 행을 그대로 돌려준다. */
    public Map<String, ?> view(String targetTable, Map<String, ?> row) {
        if (row == null || targetTable == null || randomized.isEmpty()) {
            return row;
        }
        Map<String, ColumnCipher> columns = randomized.get(ProtectedTargetColumns.unqualified(targetTable));
        if (columns == null) {
            return row;
        }
        Map<String, Object> view = new LinkedHashMap<>(row);
        for (Map.Entry<String, ?> entry : row.entrySet()) {
            ColumnCipher cipher = columns.get(entry.getKey().toLowerCase(Locale.ROOT));
            if (cipher != null && entry.getValue() instanceof CharSequence value && !value.isEmpty()) {
                view.put(entry.getKey(), cipher.checksumToken(value.toString()));
            }
        }
        return view;
    }
}

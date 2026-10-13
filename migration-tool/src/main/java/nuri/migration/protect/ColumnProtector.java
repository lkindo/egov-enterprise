package nuri.migration.protect;

import nuri.migration.model.MappingSpec;

import java.util.Base64;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

/**
 * 적재 한 번의 보호 컬럼 암호화(DEC-OPS-308).
 *
 * <p>{@link #forRun} 은 행을 읽거나 실행 상태를 만들기 전에 부른다. 선언 위반이나 키 부재는 그 자리에서 멈춘다.
 * 키는 실행 때 {@value #KEY_ENVIRONMENT} 로만 받는다 — mapping·plan·inventory·실행 산출물·로그 어디에도 쓰지 않는다.
 *
 * <p>{@link #protect} 는 문자열 값만 암호화한다. 숫자·날짜 같은 값은 {@code toString} 이 앞자리 0 이나 표기를 바꿔
 * 다른 값을 조용히 암호화하므로 멈춘다 — 정규화하는 변환기를 선언해 문자열로 넘긴다. 빈 문자열은 온라인 변환기처럼
 * NULL 로 두고, 그 밖의 값을 암호화한 뒤 두 가지를 확인한다. 같은 키로 되읽어 원래 값이 나오는지(채움 규칙 때문에
 * 같은 키로도 되읽지 못하는 값을 막는다 — 키가 온라인 ALGORITHM_KEY 와 같은지는 증명하지 않는다), 쓰려는 값이
 * 평문 형태가 아니고 암호문 형식인지. 하나라도 어긋나면 그 행이 든 chunk 를 쓰지 않고 적재를 멈춘다(DEC-OPS-309).
 * 오류 문구는 테이블·컬럼 이름과 고정 사유만 담는다.
 */
public final class ColumnProtector {

    /** 온라인 앱 ALGORITHM_KEY 와 같은 값을 이관 호스트에 주입하는 환경 변수. */
    public static final String KEY_ENVIRONMENT = "MIGRATION_ALGORITHM_KEY";

    private static final ColumnProtector NONE = new ColumnProtector(Map.of(), null);

    private final Map<String, ColumnProtectionPlan.ProtectedColumn> columns;
    private final ColumnCipher cipher;

    ColumnProtector(Map<String, ColumnProtectionPlan.ProtectedColumn> columns, ColumnCipher cipher) {
        this.columns = Map.copyOf(columns);
        this.cipher = cipher;
    }

    /** 보호 컬럼이 없는 실행. */
    public static ColumnProtector none() {
        return NONE;
    }

    /**
     * mapping 의 보호 선언을 확인하고 키를 받는다. 위반·키 부재는 {@link IllegalStateException} 이다.
     *
     * @param environment 환경 변수 또는 승인된 secret provider adapter(테스트도 같은 경로를 쓴다)
     */
    public static ColumnProtector forRun(MappingSpec spec, Function<String, String> environment) {
        Objects.requireNonNull(environment, "environment");
        ColumnProtectionPlan plan = ColumnProtectionPlan.of(spec);
        if (!plan.violations().isEmpty()) {
            throw new IllegalStateException("보호 컬럼 선언 오류: " + String.join("; ", plan.violations()));
        }
        if (plan.columns().isEmpty()) {
            return NONE;
        }
        String key = environment.apply(KEY_ENVIRONMENT);
        if (key == null || key.isBlank()) {
            throw new IllegalStateException("보호 컬럼 암호화 키가 없습니다 — 환경 변수 " + KEY_ENVIRONMENT
                    + " 에 온라인 앱 ALGORITHM_KEY 와 같은 값을 주입하세요: "
                    + String.join(", ", plan.columns().values().stream()
                    .map(column -> column.targetTable() + "." + column.column()).sorted().toList()));
        }
        return new ColumnProtector(plan.columns(), new EgovAriaColumnCipher(key));
    }

    /** 보호 컬럼이 아니면 값을 그대로 돌려준다. */
    public Object protect(String targetTable, String column, Object value) {
        ColumnProtectionPlan.ProtectedColumn target = columns.get(ColumnProtectionPlan.key(targetTable, column));
        if (target == null || value == null) {
            return value;
        }
        String name = targetTable + "." + column;
        if (value instanceof byte[]) {
            throw new ProtectedColumnException(name, "이진 값은 암호화할 수 없습니다");
        }
        if (!(value instanceof CharSequence text)) {
            throw new ProtectedColumnException(name,
                    "문자열이 아닌 값은 암호화하지 않습니다 — 정규화하는 변환기를 선언해 문자열로 넘기세요");
        }
        String plaintext = text.toString();
        if (plaintext.isBlank()) {
            return null;
        }
        String ciphertext = cipher.encrypt(plaintext);
        requireCiphertext(target.entry(), name, ciphertext);
        String readBack;
        try {
            readBack = cipher.decrypt(ciphertext);
        } catch (RuntimeException unreadable) {
            throw new ProtectedColumnException(name, "온라인 앱이 되읽을 수 없는 값입니다");
        }
        if (!plaintext.equals(readBack)) {
            throw new ProtectedColumnException(name, "온라인 앱이 되읽을 수 없는 값입니다");
        }
        return ciphertext;
    }

    /** 쓰려는 값이 평문 형태면 멈추고, 표준 Base64 로 쓴 16바이트 배수 암호문이 아니어도 멈춘다. */
    private static void requireCiphertext(ProtectedTargetColumns.Entry entry, String name, String value) {
        if (entry.plaintext() != null && entry.plaintext().matcher(value).matches()) {
            throw new ProtectedColumnException(name, "평문 형태의 값은 암호화 컬럼에 쓸 수 없습니다");
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(value);
        } catch (IllegalArgumentException notBase64) {
            throw new ProtectedColumnException(name, "암호문 형식이 아닌 값은 암호화 컬럼에 쓸 수 없습니다");
        }
        if (decoded.length == 0 || decoded.length % AriaEngine.BLOCK_BYTES != 0
                || !Base64.getEncoder().encodeToString(decoded).equals(value)) {
            throw new ProtectedColumnException(name, "암호문 형식이 아닌 값은 암호화 컬럼에 쓸 수 없습니다");
        }
    }

    /** 보호 컬럼 값을 쓰지 않기로 한 판정. 문구는 테이블·컬럼 이름과 고정 사유만 담는다. */
    public static final class ProtectedColumnException extends IllegalStateException {

        private final String reason;

        ProtectedColumnException(String name, String reason) {
            super("PROTECTED_COLUMN " + name + ": " + reason);
            this.reason = reason;
        }

        /** 값이 들어가지 않는 고정 사유. */
        public String reason() {
            return reason;
        }
    }
}

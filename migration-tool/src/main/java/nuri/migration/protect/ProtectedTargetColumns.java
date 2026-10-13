package nuri.migration.protect;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 표준 스키마에서 온라인 앱이 값을 암호화해 저장하는 컬럼 목록(DEC-OPS-308).
 *
 * <p>대상 DB 에는 "이 컬럼은 암호문이다" 라는 표시가 없다. 그래서 이관 도구가 이 목록을 갖고, mapping 이 이 컬럼을
 * 쓰면서 {@code encrypt} 를 선언하지 않거나 다른 방식을 선언하면 행을 쓰기 전에 멈춘다. 목록과 온라인 소스의 일치는
 * {@code OnlineRrnoConverterContractTest} 가 온라인 엔티티의 {@code @Convert}·{@code @Table}·{@code @Column} 을 읽어
 * 양방향으로 대조한다.
 *
 * <p>해시로 저장하는 값(비밀번호·복구 코드·인증 요청·리프레시 토큰)은 암호화가 아니라 이 목록에 없다.
 */
public final class ProtectedTargetColumns {

    /** 보호 컬럼 하나. {@code plaintext} 는 쓰기 직전 값이 평문 형태인지 보는 패턴이다(없으면 null). */
    public record Entry(String table, String column, ColumnProtection protection, Pattern plaintext) {}

    /** 온라인 {@code RrnoEncryptionConverter} 의 과거 평문 허용 패턴과 같다. */
    static final Pattern PLAINTEXT_RRNO = Pattern.compile("^\\d{6}-?\\d{7}$");

    private static final List<Entry> ENTRIES = List.of(
            new Entry("tb_user_info", "user_enrrno", ColumnProtection.ARIA_EGOV_V1, PLAINTEXT_RRNO),
            new Entry("tb_auth_otp_cert", "otp_secret_encpt_cn", ColumnProtection.MFA_AES_GCM_V1, null));

    private ProtectedTargetColumns() {}

    public static List<Entry> entries() {
        return ENTRIES;
    }

    /** 스키마 한정 이름({@code public.tb_user_info})도 마지막 이름으로 대조한다. 대소문자는 무시한다. */
    public static Optional<Entry> find(String targetTable, String column) {
        if (targetTable == null || column == null) {
            return Optional.empty();
        }
        String table = unqualified(targetTable);
        String name = column.toLowerCase(Locale.ROOT);
        return ENTRIES.stream()
                .filter(entry -> entry.table().equals(table) && entry.column().equals(name))
                .findFirst();
    }

    static String unqualified(String targetTable) {
        return targetTable.substring(targetTable.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}

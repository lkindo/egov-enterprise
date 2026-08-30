package nuri.migration.state;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** 소스 변환 결과와 재조회한 타깃 행을 같은 규칙으로 비교하는 결정적 SHA-256. */
public final class RowChecksum {

    private RowChecksum() {
    }

    public static String calculate(List<String> columns, Map<String, ?> row) {
        Map<String, Object> normalized = new LinkedHashMap<>();
        row.forEach((key, value) -> normalized.put(key.toLowerCase(Locale.ROOT), value));
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다", e);
        }
        for (String column : columns) {
            update(digest, column.toLowerCase(Locale.ROOT));
            Object value = normalized.get(column.toLowerCase(Locale.ROOT));
            update(digest, canonical(value));
        }
        return java.util.HexFormat.of().formatHex(digest.digest());
    }

    private static void update(MessageDigest digest, String value) {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        digest.update(Integer.toString(bytes.length).getBytes(StandardCharsets.US_ASCII));
        digest.update((byte) ':');
        digest.update(bytes);
        digest.update((byte) '|');
    }

    private static String canonical(Object value) {
        if (value == null) {
            return "<null>";
        }
        if (value instanceof byte[] bytes) {
            return "base64:" + Base64.getEncoder().encodeToString(bytes);
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.stripTrailingZeros().toPlainString();
        }
        return value.toString();
    }
}

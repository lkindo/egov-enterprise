package nuri.migration.state;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharsetEncoder;
import java.nio.charset.CoderResult;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Blob;
import java.sql.Clob;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** 소스 변환 결과와 재조회한 타깃 행을 같은 규칙으로 비교하는 결정적 SHA-256. */
public final class RowChecksum {

    private static final int ENCODING_BUFFER_SIZE = 8192;
    private static final byte[] BINARY_PREFIX = "base64:".getBytes(StandardCharsets.US_ASCII);

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
            if (value instanceof byte[] bytes) {
                updateBinary(digest, bytes);
            } else {
                update(digest, canonical(value));
            }
        }
        return java.util.HexFormat.of().formatHex(digest.digest());
    }

    private static void update(MessageDigest digest, String value) {
        if (value.length() <= ENCODING_BUFFER_SIZE / 4) {
            byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
            beginField(digest, bytes.length);
            digest.update(bytes);
        } else {
            // Keep the durable UTF-8 length framing without copying the entire CLOB again.
            CharsetEncoder encoder = StandardCharsets.UTF_8.newEncoder()
                    .onMalformedInput(CodingErrorAction.REPLACE)
                    .onUnmappableCharacter(CodingErrorAction.REPLACE);
            ByteBuffer buffer = ByteBuffer.allocate(ENCODING_BUFFER_SIZE);
            long length = encodeUtf8(encoder, value, buffer, null);
            beginField(digest, length);
            encoder.reset();
            encodeUtf8(encoder, value, buffer, digest);
        }
        digest.update((byte) '|');
    }

    private static long encodeUtf8(CharsetEncoder encoder, String value,
            ByteBuffer buffer, MessageDigest digest) {
        CharBuffer characters = CharBuffer.wrap(value);
        long length = 0;
        boolean flushing = false;
        while (true) {
            CoderResult result = flushing ? encoder.flush(buffer) : encoder.encode(characters, buffer, true);
            length += buffer.position();
            buffer.flip();
            if (digest != null) {
                digest.update(buffer);
            }
            buffer.clear();
            if (result.isError()) {
                throw new IllegalStateException("UTF-8 체크섬 인코딩 실패");
            }
            if (result.isUnderflow()) {
                if (flushing) {
                    return length;
                }
                flushing = true;
            }
        }
    }

    private static void updateBinary(MessageDigest digest, byte[] bytes) {
        // The base64: prefix and padded Base64 bytes must match existing checkpoints exactly.
        beginField(digest, BINARY_PREFIX.length + 4L * ((bytes.length + 2L) / 3));
        digest.update(BINARY_PREFIX);
        try (OutputStream encoded = Base64.getEncoder().wrap(
                new DigestOutputStream(OutputStream.nullOutputStream(), digest))) {
            encoded.write(bytes);
        } catch (IOException e) {
            throw new IllegalStateException("바이너리 체크섬 인코딩 실패", e);
        }
        digest.update((byte) '|');
    }

    private static void beginField(MessageDigest digest, long length) {
        digest.update(Long.toString(length).getBytes(StandardCharsets.US_ASCII));
        digest.update((byte) ':');
    }

    private static String canonical(Object value) {
        if (value == null) {
            return "<null>";
        }
        if (value instanceof Blob || value instanceof Clob) {
            throw new IllegalArgumentException("LOB_CONTENT_NOT_MATERIALIZED");
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.stripTrailingZeros().toPlainString();
        }
        return value.toString();
    }
}

package nuri.business.service.file;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * S3 호환 저장소 요청 서명(AWS Signature Version 4). SDK 의존 없이 JDK 만으로 서명한다 — 저장소 어댑터 하나 때문에 큰 SDK 를
 * 런타임 의존에 더하지 않는다(공급망·라이선스 표면). 서명 결과는 AWS 문서의 예제 값으로 시험한다.
 */
final class S3RequestSigner {

    static final String UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
    static final String EMPTY_PAYLOAD_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    private final String accessKey;
    private final String secretKey;
    private final String region;

    S3RequestSigner(String accessKey, String secretKey, String region) {
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.region = region;
    }

    /**
     * 서명한 헤더 묶음을 돌려준다(Authorization·x-amz-date·x-amz-content-sha256 과 서명에 넣은 추가 헤더).
     *
     * @param method      HTTP 메서드
     * @param host        Host 헤더 값(포트 포함 가능)
     * @param encodedPath 이미 RFC 3986 로 인코딩한 경로(/로 시작)
     * @param query       인코딩 전 쿼리 이름→값(빈 값 허용)
     * @param extra       서명에 넣을 추가 헤더(소문자 이름)
     * @param payloadHash 본문의 SHA-256 hex 또는 {@link #UNSIGNED_PAYLOAD}
     * @param now         서명 시각(순간 값)
     */
    Map<String, String> sign(String method, String host, String encodedPath, Map<String, String> query,
            Map<String, String> extra, String payloadHash, Instant now) {
        String amzDate = amzDate(now);
        String scopeDate = amzDate.substring(0, 8);
        TreeMap<String, String> headers = new TreeMap<>();
        extra.forEach((name, value) -> headers.put(name.toLowerCase(Locale.ROOT), value.trim()));
        headers.put("host", host);
        headers.put("x-amz-content-sha256", payloadHash);
        headers.put("x-amz-date", amzDate);
        String canonicalHeaders = headers.entrySet().stream()
                .map(entry -> entry.getKey() + ":" + entry.getValue() + "\n").collect(Collectors.joining());
        String signedHeaders = String.join(";", headers.keySet());
        String canonicalQuery = canonicalQuery(query);
        String canonicalRequest = method + "\n" + encodedPath + "\n" + canonicalQuery + "\n" + canonicalHeaders + "\n"
                + signedHeaders + "\n" + payloadHash;
        String scope = scopeDate + "/" + region + "/s3/aws4_request";
        String stringToSign = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + sha256Hex(canonicalRequest);
        byte[] key = hmac(("AWS4" + secretKey).getBytes(StandardCharsets.UTF_8), scopeDate);
        key = hmac(key, region);
        key = hmac(key, "s3");
        key = hmac(key, "aws4_request");
        String signature = HexFormat.of().formatHex(hmac(key, stringToSign));
        Map<String, String> signed = new TreeMap<>(headers);
        signed.remove("host");
        signed.put("authorization", "AWS4-HMAC-SHA256 Credential=" + accessKey + "/" + scope
                + ",SignedHeaders=" + signedHeaders + ",Signature=" + signature);
        return signed;
    }

    /**
     * SigV4 서명 시각(yyyyMMdd'T'HHmmss'Z'). 서명은 협정 세계시 표기를 요구하므로 시간대를 고르지 않고 {@link Instant} 의
     * ISO-8601 원문(초 단위로 자른 {@code 2013-05-24T00:00:00Z})에서 구분자만 걷는다 — 서비스 시각 규칙(KST)과 무관한 순간 값이다.
     */
    static String amzDate(Instant now) {
        String iso = now.truncatedTo(ChronoUnit.SECONDS).toString();
        if (!iso.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z")) {
            throw new IllegalArgumentException("서명 시각이 지원 범위를 벗어났습니다");
        }
        return iso.replace("-", "").replace(":", "");
    }

    static String canonicalQuery(Map<String, String> query) {
        return new TreeMap<>(query).entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue() == null ? "" : entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    /** RFC 3986 비예약 문자만 남기고 퍼센트 인코딩한다(SigV4 규칙). */
    static String encode(String value) {
        StringBuilder out = new StringBuilder();
        for (byte b : value.getBytes(StandardCharsets.UTF_8)) {
            int c = b & 0xff;
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                    || c == '-' || c == '_' || c == '.' || c == '~') {
                out.append((char) c);
            } else {
                out.append('%').append(String.format(Locale.ROOT, "%02X", c));
            }
        }
        return out.toString();
    }

    /** 경로 조각마다 인코딩하고 구분자 / 는 남긴다. */
    static String encodePath(String path) {
        return java.util.Arrays.stream(path.split("/", -1)).map(S3RequestSigner::encode).collect(Collectors.joining("/"));
    }

    static String sha256Hex(String value) {
        return sha256Hex(value.getBytes(StandardCharsets.UTF_8));
    }

    static String sha256Hex(byte[] value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));
        } catch (GeneralSecurityException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private static byte[] hmac(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}

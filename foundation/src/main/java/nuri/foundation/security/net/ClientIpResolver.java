package nuri.foundation.security.net;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 클라이언트 IP를 <b>신뢰 경계에 근거해</b> 판정한다.
 *
 * <p>[존재 이유 — W1-07] 종전에는 {@code X-Forwarded-For} 를 <b>검증 없이 신뢰하는</b> 구현이
 * 서로 다른 모듈에 두 벌 있었고 동작도 달랐다:
 * <ul>
 *   <li>{@code api-server}: XFF → Proxy-Client-IP → WL-Proxy-Client-IP → remoteAddr (unknown 처리 있음)</li>
 *   <li>{@code business-core}(RateLimitFilter): XFF 첫 항목만, unknown 미처리</li>
 * </ul>
 * 헤더는 누구나 보낼 수 있으므로 그 결과 <b>레이트리밋 우회</b>(헤더를 바꿔가며 무한 버킷 생성),
 * <b>로그인 IP 제한 우회</b>, <b>감사 로그 IP 위조</b>가 전부 가능했다.
 * 모듈이 갈려 있어(business-core 는 api-server 를 볼 수 없다) 통합하려면 foundation 이 유일한 자리다.
 *
 * <p><b>핵심 원리 — 신뢰는 헤더가 아니라 피어(peer)로 판정한다.</b>
 * {@code remoteAddr} 은 TCP 연결의 상대이므로 위조할 수 없다. 그 피어가 신뢰 목록에 있을 때만
 * 그가 붙인 XFF 를 읽는다. 이 설계는 배포 형상이 바뀌어도 안전 쪽으로 무너진다:
 * <ul>
 *   <li>피어가 프록시(사설 대역) → XFF 신뢰 → 실제 클라이언트 IP 획득</li>
 *   <li>피어가 외부 클라이언트(공인 IP) → 불신 → remoteAddr 사용 (= 위조 불가한 진짜 주소)</li>
 * </ul>
 * 즉 백엔드 포트가 실수로 외부에 열려도 이 판정은 깨지지 않는다.
 *
 * <p><b>기본값은 루프백뿐이다(2026-11-25 DEC-OPS-432).</b> 종전 기본값은 사설 대역 셋(10/8·172.16/12·192.168/16)이었고,
 * 그러면 사내망의 다른 접속자도 신뢰 프록시가 되어 자기 XFF 로 요청 한도·감사 IP 를 바꿀 수 있었다. 이 기본값은
 * {@code application.yml} 의 {@code nuri.security.trusted-proxies} 를 빠뜨린 배포(설정을 통째로 바꾼 생성 프로젝트·기관 배포)에서만
 * 쓰이므로 좁은 쪽으로 둔다. 실제 배포는 Next 의 고정 주소를 명시한다(compose 의 {@code TRUSTED_PROXIES}).
 * 신뢰 목록을 비워 두면 XFF 를 전면 불신해 <b>모든 트래픽이 Next 서버 1개 IP 로 수렴</b>하고, 레이트리밋이 전역 단일
 * 버킷이 되어 스스로를 막는다(자기 DoS) — 프록시 뒤에 둘 때는 그 주소를 꼭 준다.
 *
 * <p>⚠ <b>이 클래스를 바꿀 때 레이트리밋 용량을 같은 배포에 함께 조정하지 말 것.</b>
 * 순서는 ① 신뢰 경계 주입 → ② 관측 → ③ 용량 조정이다. 둘을 묶으면 전사 로그인 장애가 된다.
 */
@Slf4j
@Component
public class ClientIpResolver {

    /** 프록시가 원 클라이언트를 실어 보내는 헤더. 표준인 XFF 만 읽는다. */
    private static final String XFF = "X-Forwarded-For";

    private final List<CidrRange> trustedProxies;

    public ClientIpResolver(
            @Value("${nuri.security.trusted-proxies:127.0.0.1/32,::1/128}") String trustedProxiesCsv) {
        this.trustedProxies = parse(trustedProxiesCsv);
        if (this.trustedProxies.isEmpty()) {
            log.warn("[ClientIpResolver] 신뢰 프록시 목록이 비어 있습니다 — X-Forwarded-For 를 전면 불신합니다. "
                    + "프록시 뒤에 있다면 모든 요청이 프록시 IP 하나로 수렴해 레이트리밋이 전역 단일 버킷이 됩니다.");
        }
    }

    /**
     * 요청의 클라이언트 IP를 판정한다.
     *
     * <p>피어가 신뢰 프록시가 아니면 XFF 를 읽지 않고 {@code remoteAddr} 을 그대로 쓴다.
     * 신뢰 프록시면 XFF 를 <b>오른쪽에서 왼쪽으로</b> 훑어 신뢰 목록에 없는 첫 항목을 클라이언트로 본다
     * (오른쪽일수록 우리에게 가까운 홉이다). 전부 신뢰 대역이면 <b>가장 오른쪽</b> 값을 쓴다 —
     * 그 값만이 우리 프록시가 기록한 것이고, 요청자가 끼워넣은 값은 항상 그 왼쪽에 온다.
     *
     * <p>'XFF 첫 항목을 그대로 채택'하는 방식은 쓰지 않는다 — 그 값은 클라이언트가 임의로 넣을 수 있다.
     */
    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return "unknown";
        }
        if (!isTrusted(remoteAddr)) {
            return remoteAddr;
        }

        String header = request.getHeader(XFF);
        if (header == null || header.isBlank()) {
            return remoteAddr;
        }

        String[] hops = header.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String candidate = normalize(hops[i]);
            if (candidate == null) {
                continue;
            }
            if (!isTrusted(candidate)) {
                return candidate;
            }
        }
        // 전부 신뢰 대역 — 사내 트래픽이다. **가장 오른쪽** 값을 쓴다.
        //
        // [왜 최좌측이 아닌가 — 2026-08-03 정정] XFF 는 홉마다 append 하는 헤더다. 따라서
        // 최우측 항목은 <b>우리에게 가장 가까운 프록시가 기록한 값</b>이고, 공격자가 끼워넣은 값은
        // 항상 그 왼쪽에 온다(공격자는 앞에 덧붙일 수만 있고 뒤에 쓸 수는 없다).
        // 종전의 최좌측 채택은 사내망 클라이언트가 스스로 `X-Forwarded-For: 10.1.2.3` 을 실어 보내면
        // 그 조작값을 그대로 채택했다 — 레이트리밋 키·로그인 IP 제한·감사 IP 를 요청자가 바꿀 수 있었다.
        // 신뢰 대역에 사설 IP 전 범위가 들어 있으므로 이 조건은 드물지 않다.
        //
        // [왜 remoteAddr 폴백이 아닌가] 그쪽이 위조에는 더 강하지만, <b>사내망 사용자 전원의 IP 가
        // 프록시 1개로 수렴</b>해 레이트리밋이 전 사내 트래픽에 대해 단일 버킷이 된다 —
        // 원장이 경고한 '순서 지뢰 1(전사 로그인 장애)' 과 같은 계열의 가용성 위험이다.
        // 최우측 채택은 어느 형상에서도 최좌측보다 나쁘지 않으면서(홉이 1개면 동일),
        // 프록시가 append 하는 형상에서는 실제 클라이언트 IP 를 보존한다.
        //
        // 운영 compose 는 신뢰 대역을 egov-net 으로 좁혀 이 분기를 실제 프록시 요청에만 허용한다.
        // LB·nginx·CDN 추가 등 홉이 바뀌면 docker-compose.prod.yml 의 TRUSTED_PROXIES 와 네트워크
        // 서브넷을 함께 재판정한다. ConfigSafetyLinterTest 가 현재 두 선언의 정합을 강제한다.
        for (int i = hops.length - 1; i >= 0; i--) {
            String candidate = normalize(hops[i]);
            if (candidate != null) {
                return candidate;
            }
        }
        return remoteAddr;
    }

    private static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String v = raw.trim();
        if (v.isEmpty() || "unknown".equalsIgnoreCase(v)) {
            return null;
        }
        // IPv6 대괄호 표기와 포트 접미를 제거한다. IPv4 는 콜론이 하나뿐일 때만 포트로 본다.
        if (v.startsWith("[")) {
            int close = v.indexOf(']');
            v = close > 0 ? v.substring(1, close) : null;
            if (v == null) {
                return null;
            }
        }
        int colon = v.indexOf(':');
        if (colon > 0 && v.indexOf(':', colon + 1) < 0) {
            v = v.substring(0, colon);
        }
        try {
            // XFF는 외부 입력이다. 임의 문자열을 그대로 반환하면 레이트리밋 키를 무한히
            // 늘리고 varchar IP 감사 컬럼의 INSERT를 실패시킬 수 있다. DNS 조회 없이 IP
            // 리터럴만 받아 표준 표기로 정규화한다(IPv6 최대 39자).
            return IpAddressCanonicalizer.canonicalize(v);
        } catch (IllegalArgumentException invalidAddress) {
            return null;
        }
    }

    private boolean isTrusted(String ip) {
        for (CidrRange range : trustedProxies) {
            if (range.contains(ip)) {
                return true;
            }
        }
        return false;
    }

    private static List<CidrRange> parse(String csv) {
        List<CidrRange> result = new ArrayList<>();
        if (csv == null || csv.isBlank()) {
            return result;
        }
        for (String token : csv.split(",")) {
            String t = token.trim();
            if (t.isEmpty()) {
                continue;
            }
            CidrRange range = CidrRange.parse(t);
            if (range != null) {
                result.add(range);
            } else {
                log.warn("[ClientIpResolver] 신뢰 프록시 항목을 해석하지 못해 무시합니다.");
            }
        }
        return result;
    }

    /**
     * IPv4(32비트)와 IPv6(128비트) 리터럴을 DNS 조회 없이 바이트 단위로 비교한다.
     * 호스트명·범위 밖 프리픽스·형식 오류는 null 로 버린다.
     */
    private static final class CidrRange {
        private final byte[] network;
        private final int prefixBits;

        private CidrRange(byte[] network, int prefixBits) {
            this.network = network;
            this.prefixBits = prefixBits;
        }

        static CidrRange parse(String token) {
            int slash = token.indexOf('/');
            String addr = (slash < 0 ? token : token.substring(0, slash)).trim();
            if (addr.isEmpty()) {
                return null;
            }
            java.net.InetAddress parsed = parseLiteral(addr);
            if (parsed == null) {
                return null;
            }
            byte[] bytes = parsed.getAddress();
            int maxPrefix = bytes.length * 8;
            int prefix = maxPrefix;
            if (slash >= 0) {
                try {
                    prefix = Integer.parseInt(token.substring(slash + 1).trim());
                } catch (NumberFormatException e) {
                    return null;
                }
                if (prefix < 0 || prefix > maxPrefix) {
                    return null;
                }
            }
            return new CidrRange(applyMask(bytes, prefix), prefix);
        }

        boolean contains(String ip) {
            java.net.InetAddress parsed = parseLiteral(stripOptionalBrackets(ip));
            if (parsed == null) {
                return false;
            }
            byte[] candidate = parsed.getAddress();
            if (candidate.length != network.length) {
                return false;
            }
            int fullBytes = prefixBits / 8;
            for (int i = 0; i < fullBytes; i++) {
                if (candidate[i] != network[i]) {
                    return false;
                }
            }
            int remBits = prefixBits % 8;
            if (remBits == 0) {
                return true;
            }
            int mask = 0xFF << (8 - remBits);
            return ((candidate[fullBytes] ^ network[fullBytes]) & mask) == 0;
        }

        private static java.net.InetAddress parseLiteral(String literal) {
            if (literal == null || literal.isBlank()) {
                return null;
            }
            try {
                return com.google.common.net.InetAddresses.forString(literal.trim());
            } catch (IllegalArgumentException invalidLiteral) {
                return null;
            }
        }

        private static String stripOptionalBrackets(String raw) {
            if (raw == null) {
                return null;
            }
            String trimmed = raw.trim();
            if (trimmed.startsWith("[")) {
                int close = trimmed.indexOf(']');
                return close > 0 ? trimmed.substring(1, close) : null;
            }
            return trimmed;
        }

        private static byte[] applyMask(byte[] raw, int prefixBits) {
            byte[] masked = Arrays.copyOf(raw, raw.length);
            int fullBytes = prefixBits / 8;
            int remBits = prefixBits % 8;
            if (fullBytes < masked.length) {
                if (remBits > 0) {
                    masked[fullBytes] = (byte) (masked[fullBytes] & (0xFF << (8 - remBits)));
                    fullBytes++;
                }
                Arrays.fill(masked, fullBytes, masked.length, (byte) 0);
            }
            return masked;
        }

        @Override
        public String toString() {
            return Arrays.toString(network) + "/" + prefixBits;
        }
    }
}

package nuri.foundation.security.net;

import com.google.common.net.InetAddresses;

/**
 * DNS 조회 없이 IPv4/IPv6 리터럴을 하나의 비교 가능한 표준형으로 바꾼다.
 *
 * <p>호스트명은 받아들이지 않는다. {@link InetAddresses#forString(String)}은 이름 해석을 하지
 * 않으므로 외부 입력이 DNS 지연이나 예기치 않은 주소로 바뀌는 경로가 없다.</p>
 */
public final class IpAddressCanonicalizer {

    private IpAddressCanonicalizer() {
    }

    /**
     * IP 리터럴을 표준 문자열로 변환한다.
     *
     * @throws IllegalArgumentException 값이 비었거나 유효한 IPv4/IPv6 리터럴이 아닐 때
     */
    public static String canonicalize(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("IP address must not be blank");
        }
        return InetAddresses.toAddrString(InetAddresses.forString(value.trim()));
    }
}

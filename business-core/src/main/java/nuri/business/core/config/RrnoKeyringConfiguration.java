package nuri.business.core.config;

import nuri.business.domain.common.RrnoKeyring;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

import java.util.HashMap;
import java.util.Map;

/**
 * 주민등록번호 키링 구성(Wave 4). {@code nuri.crypto.rrno.active-key-id}·{@code keys-json}(MFA 키링과 같은 모양:
 * {@code {"<keyId>":"<32바이트 표준 Base64>"}})을 읽어 {@link RrnoKeyring} 을 채운다. 둘 다 비면 키링을 끄고 종전 ARIA 로 쓴다.
 * 하나만 있거나 모양이 틀리면 기동을 멈춘다 — 키 원문과 원인 메시지는 예외에 담지 않는다.
 */
@Configuration(proxyBeanMethods = false)
public class RrnoKeyringConfiguration {

    public RrnoKeyringConfiguration(@Value("${nuri.crypto.rrno.active-key-id:}") String activeKeyId,
            @Value("${nuri.crypto.rrno.keys-json:}") String keysJson) {
        RrnoKeyring.configure(activeKeyId, parse(keysJson));
    }

    private static Map<String, String> parse(String keysJson) {
        if (keysJson == null || keysJson.isBlank()) {
            return Map.of();
        }
        try {
            var node = JsonMapper.builder().build().readTree(keysJson);
            if (!node.isObject()) {
                throw new IllegalArgumentException("Invalid rrno encryption keyring");
            }
            Map<String, String> keys = new HashMap<>();
            for (var entry : node.properties()) {
                if (!entry.getValue().isString()) {
                    throw new IllegalArgumentException("Invalid rrno encryption keyring");
                }
                keys.put(entry.getKey(), entry.getValue().asString());
            }
            return keys;
        } catch (RuntimeException ignored) {
            throw new IllegalArgumentException("Invalid rrno encryption keyring");
        }
    }
}

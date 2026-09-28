package nuri.business.service.auth.mfa;

import java.util.HashMap;
import java.util.Map;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.mfa.MfaSecretCipher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** 미구성 상태는 등록 준비 미완료다. 이미 등록한 자격을 비밀번호 전용으로 낮추지 않는다. */
@Component
public final class MfaSettings {
    private final MfaSecretCipher cipher;
    private final boolean requireProtected;

    public MfaSettings(@Value("${nuri.security.mfa.active-key-id:}") String activeKeyId,
            @Value("${nuri.security.mfa.keys-json:}") String keysJson,
            @Value("${nuri.security.mfa.require-protected:false}") boolean requireProtected) {
        this.requireProtected = requireProtected;
        if (activeKeyId.isBlank() && keysJson.isBlank()) {
            if (requireProtected) throw new IllegalStateException("MFA enforcement requires a configured keyring");
            cipher = null;
            return;
        }
        try {
            var parsed = JsonMapper.builder().build().readTree(keysJson);
            if (!parsed.isObject() || parsed.size() == 0 || parsed.size() > 16) {
                throw new IllegalArgumentException();
            }
            Map<String, String> keys = new HashMap<>();
            for (var entry : parsed.properties()) {
                if (!entry.getValue().isString()) throw new IllegalArgumentException();
                keys.put(entry.getKey(), entry.getValue().asString());
            }
            cipher = new MfaSecretCipher(activeKeyId, keys);
        } catch (RuntimeException invalid) {
            // Jackson/Base64 원인에는 설정값이 들어갈 수 있으므로 원인을 포함하지 않는다.
            throw new IllegalStateException("Invalid MFA encryption configuration");
        }
    }

    public boolean available() { return cipher != null; }
    public boolean requireProtected() { return requireProtected; }
    public MfaSecretCipher cipher() {
        if (cipher == null) throw new BusinessException(MfaErrorCode.UNAVAILABLE);
        return cipher;
    }
}

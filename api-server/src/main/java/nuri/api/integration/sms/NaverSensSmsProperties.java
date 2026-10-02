package nuri.api.integration.sms;

import java.time.Duration;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** SENS 자격 증명은 환경변수에서 바인딩하고 오류 메시지에 값을 포함하지 않는다. */
@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "nuri.sms.sens")
public class NaverSensSmsProperties {
    private String serviceId;
    private String accessKey;
    private String secretKey;
    private String registeredSender;
    private Duration connectTimeout = Duration.ofSeconds(3);
    private Duration requestTimeout = Duration.ofSeconds(10);

    void validate() {
        if (serviceId == null || !serviceId.matches("[A-Za-z0-9_:.~-]{1,160}")
                || serviceId.equals(".") || serviceId.equals("..")) {
            throw new IllegalArgumentException("SENS service-id is missing or invalid");
        }
        if (accessKey == null || !accessKey.matches("[!-~]{1,256}")) {
            throw new IllegalArgumentException("SENS access-key is missing or invalid");
        }
        if (secretKey == null || !secretKey.matches("[!-~]{1,512}")) {
            throw new IllegalArgumentException("SENS secret-key is missing or invalid");
        }
        if (registeredSender == null || !registeredSender.matches("[0-9]{1,11}")) {
            throw new IllegalArgumentException("SENS registered-sender must contain 1 to 11 digits");
        }
        if (!bounded(connectTimeout, Duration.ofSeconds(10))
                || !bounded(requestTimeout, Duration.ofSeconds(30))
                || requestTimeout.compareTo(connectTimeout) < 0) {
            throw new IllegalArgumentException("SENS timeouts must be bounded and request-timeout must cover connect-timeout");
        }
    }

    private static boolean bounded(Duration value, Duration maximum) {
        return value != null && value.compareTo(Duration.ofMillis(100)) >= 0
                && value.compareTo(maximum) <= 0;
    }

    @Override
    public String toString() {
        return "NaverSensSmsProperties[values=redacted]";
    }
}

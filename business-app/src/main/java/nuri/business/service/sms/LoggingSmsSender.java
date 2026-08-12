package nuri.business.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 비운영 환경 전용 비전송 구현체.
 *
 * <p>실제 게이트웨이에 전달하지 않으므로 성공을 반환하지 않는다. 운영(prod)에서는
 * {@link UnavailableSmsSender}가 미구성 상태를 명시적으로 실패 처리한다. 과거처럼 전화번호·본문을
 * 로그에 남긴 뒤 {@code true}를 반환해 DB에 "S(성공)"를 기록하는 거짓 성공을 금지한다.
 */
@Component
@Profile("!prod")
public class LoggingSmsSender implements SmsSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingSmsSender.class);

    @Override
    public boolean send(String recipientPhone, String message, String senderPhone) {
        LOGGER.warn("[SMS NOT DELIVERED - non-prod stub] recipient={}, sender={}, characters={}",
                nuri.foundation.core.util.PiiMaskUtil.phone(recipientPhone),
                nuri.foundation.core.util.PiiMaskUtil.phone(senderPhone),
                message == null ? 0 : message.length());
        return false;
    }
}

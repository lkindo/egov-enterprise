package nuri.business.service.sms;

import nuri.foundation.core.util.PiiMaskUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 운영 SMS 게이트웨이가 아직 연결되지 않았음을 명시하는 안전한 대체 구현.
 *
 * <p>애플리케이션 기동은 유지하되 발송 성공을 가장하지 않는다. 실제 공급자 연동 시 이 구현을
 * 공급자 구현으로 교체해야 하며, 전화번호 원문과 메시지 본문은 어떤 경우에도 로그에 남기지 않는다.
 */
@Component
@Profile("prod")
public class UnavailableSmsSender implements SmsSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(UnavailableSmsSender.class);

    @Override
    public boolean send(String recipientPhone, String message, String senderPhone) {
        LOGGER.error("[SMS NOT DELIVERED - prod gateway unavailable] recipient={}, sender={}, characters={}",
                PiiMaskUtil.phone(recipientPhone),
                PiiMaskUtil.phone(senderPhone),
                message == null ? 0 : message.length());
        return false;
    }
}

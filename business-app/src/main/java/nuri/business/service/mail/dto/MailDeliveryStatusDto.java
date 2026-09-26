package nuri.business.service.mail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 이 배포의 메일 발송 가능 상태(2026-09-26 DIP B5 F7).
 *
 * <p>SMTP 가 설정되지 않은 배포는 발송 접수는 되지만 모든 메일이 실패로 기록된다. 그 사실은 발송 이력이 아니라
 * <b>보내기 전에</b> 알아야 하므로 작성 화면이 조회할 수 있게 노출한다(문자의 {@code SmsDeliveryStatusDto} 와 같은 모양).
 */
@Schema(description = "메일 발송 가능 상태")
public record MailDeliveryStatusDto(

        @Schema(description = "SMTP 연결 여부. false 면 접수는 되지만 모든 메일이 실패로 기록된다.",
                requiredMode = Schema.RequiredMode.REQUIRED)
        boolean deliveryConfigured,

        @Schema(description = "현재 발송 구현체의 단순 클래스명. 운영 문의 시 어느 형상인지 식별한다.",
                requiredMode = Schema.RequiredMode.REQUIRED)
        String senderImplementation) {
}

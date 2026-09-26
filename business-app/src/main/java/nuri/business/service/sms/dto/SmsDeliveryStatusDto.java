package nuri.business.service.sms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 이 배포의 SMS 발송 가능 상태.
 *
 * <p>발송 이력·수신자 결과와 달리 <b>시도 전에</b> 알아야 하는 사실이다. 게이트웨이가 없으면
 * 접수는 성공하지만 모든 수신자 결과가 실패로 기록되므로, 화면이 그 사실을 미리 알린다.
 */
@Schema(description = "SMS 발송 가능 상태")
public record SmsDeliveryStatusDto(

        @Schema(description = "실제 발송 게이트웨이 연결 여부. false 면 접수는 되지만 전달되지 않는다.",
                requiredMode = Schema.RequiredMode.REQUIRED)
        boolean deliveryConfigured,

        @Schema(description = "현재 발송 구현체의 단순 클래스명. 운영 문의 시 어느 형상인지 식별한다.",
                requiredMode = Schema.RequiredMode.REQUIRED)
        String senderImplementation,

        /*
         * [2026-09-26 DIP V9] 작성 화면은 발신 번호 칸 없이 '02-1234-5678' 을 몰래 실어 보냈다 — 관리자가 보낸
         * 모든 문자가 이 기관의 번호가 아닌 예시 번호로 기록됐다. 배포에 등록된 발신 번호를 기본값으로 알린다.
         */
        @Schema(description = "배포에 등록된 기본 발신 번호(nuri.notification.sender.tel). 설정이 없으면 null.",
                requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, types = {"string", "null"})
        String defaultSenderTelno) {
}

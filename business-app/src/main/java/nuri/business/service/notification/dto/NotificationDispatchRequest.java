package nuri.business.service.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 관리자 알림 발송 요청(2026-09-06 DEC-OPS-042, 감사 D09-05 후속).
 *
 * <p>수신자는 사용자 고유 ID(esntlId)만 싣는다 — 메일·문자 수신자 피커(DEC-OPS-035)와 같은 축이며, 존재 확인은
 * 서버가 코어 사용자 도메인으로 한다. 제목·내용 길이는 {@code tb_user_noti} 컬럼(100·4000)과 링크(2000)의 미러다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "관리자 알림 발송 요청")
public class NotificationDispatchRequest {

    /** 요청당 수신자 상한 — 메일 발송(SentMailDto.recipients)과 같은 100 이다. */
    public static final int MAX_RECIPIENTS = 100;

    @NotEmpty
    @Size(max = MAX_RECIPIENTS)
    @Valid
    @Schema(description = "수신자 목록(사용자 고유 ID). 하나라도 존재하지 않으면 전체를 거부한다.")
    @Builder.Default
    private List<@NotNull Recipient> recipients = new ArrayList<>();

    @NotBlank
    @Size(max = 100)
    @Schema(description = "알림 제목")
    private String notiTtlNm;

    @NotBlank
    @Size(max = 4000)
    @Schema(description = "알림 내용")
    private String notiCn;

    @Size(max = 2000)
    @Schema(description = "알림을 눌렀을 때 이동할 앱 내 경로(선택)")
    private String linkUrl;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "알림 수신자")
    public static class Recipient {

        @NotBlank
        @Size(max = 20)
        @Schema(description = "수신자 고유 ID(esntlId)")
        private String esntlId;
    }
}

package nuri.business.service.notification.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import io.swagger.v3.oas.annotations.media.Schema;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "사용자 알림 DTO")
public class NotificationDto {

    // 서버 생성 PK — create 시 미전송(서버가 생성), update는 PathVariable 사용.
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Schema(description = "알림 일련번호", accessMode = Schema.AccessMode.READ_ONLY)
    private Long notiSn;

    @Size(max = 100)
    @NotBlank
    @Schema(description = "알림 제목")
    private String notiTtlNm;

    @Size(max = 4000)
    @Schema(description = "알림 내용")
    private String notiCn;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Schema(description = "알림 일시", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime notiDt;

    @Size(max = 100)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Schema(description = "알림 주기 설정", accessMode = Schema.AccessMode.READ_ONLY)
    private String notiIvlVal;

    @Size(max = 20)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Schema(description = "수신자 ID", accessMode = Schema.AccessMode.READ_ONLY)
    private String rcvrId;

    @Size(max = 1)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Schema(description = "읽음 여부", accessMode = Schema.AccessMode.READ_ONLY)
    private String readYn;

    @Size(max = 2000)
    @Schema(description = "링크 URL")
    private String linkUrl;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Schema(description = "등록 일시", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime crtDt;
}

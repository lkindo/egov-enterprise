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

    @NotBlank
    @Size(max = 20)
    @Schema(description = "알림 일련번호")
    private String notiSn;

    @Size(max = 100)
    @Schema(description = "알림 제목")
    private String notiTtlNm;

    @Size(max = 4000)
    @Schema(description = "알림 내용")
    private String notiCn;

    @Schema(description = "알림 일시")
    private LocalDateTime notiDt;

    @Size(max = 100)
    @Schema(description = "알림 주기 설정")
    private String notiIvlVal;

    @Size(max = 20)
    @Schema(description = "수신자 ID")
    private String rcvrId;

    @Size(max = 1)
    @Schema(description = "읽음 여부")
    private String readYn;

    @Size(max = 1000)
    @Schema(description = "링크 URL")
    private String linkUrl;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;
}

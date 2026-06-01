package nuri.business.service.help.dto;

import jakarta.validation.constraints.*;
import nuri.business.domain.help.OnlineManual;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "온라인 메뉴얼 DTO")
public class OnlineManualDto {

    @NotBlank
    @Size(max = 20)
    @Schema(description = "온라인 메뉴얼 ID")
    private String onlineMnlId;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "온라인 메뉴얼 명")
    private String onlineMnlNm;

    @NotBlank
    @Size(max = 12)
    @Schema(description = "온라인 메뉴얼 구분코드")
    private String onlineMnlSeCode;

    @Size(max = 1000)
    @Schema(description = "온라인 메뉴얼 정의")
    private String onlineMnlDf;

    @Size(max = 4000)
    @Schema(description = "온라인 메뉴얼 설명")
    private String onlineMnlDc;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public String getMnlId() { return onlineMnlId; }
    public String getMnlNm() { return onlineMnlNm; }
    public String getMnlDc() { return onlineMnlDc; }

    public static OnlineManualDto from(OnlineManual entity) {
        if (entity == null) return null;
        return OnlineManualDto.builder()
                .onlineMnlId(entity.getOnlineMnlId())
                .onlineMnlNm(entity.getOnlineMnlNm())
                .onlineMnlSeCode(entity.getOnlineMnlSeCode())
                .onlineMnlDf(entity.getOnlineMnlDf())
                .onlineMnlDc(entity.getOnlineMnlDc())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}

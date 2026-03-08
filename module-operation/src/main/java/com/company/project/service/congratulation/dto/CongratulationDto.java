package com.company.project.service.congratulation.dto;

import com.company.project.domain.congratulation.Congratulation;
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
@Schema(description = "경조사 (Congratulation/Condolence) DTO")
public class CongratulationDto {

    @Schema(description = "경조사 ID")
    private String congratulationId;

    @Schema(description = "사용자 ID")
    private String userId;

    @Schema(description = "경조사 구분 코드")
    private String congratulationCode;

    @Schema(description = "신청 일자")
    private String requestDate;

    @Schema(description = "경조사명")
    private String congratulationName;

    @Schema(description = "대상자명")
    private String trgterName;

    @Schema(description = "대상자 생년월일")
    private String birthday;

    @Schema(description = "발생 일자")
    private String occurrenceDate;

    @Schema(description = "관계")
    private String relate;

    @Schema(description = "비고/사유")
    private String remark;

    @Schema(description = "결재자 ID")
    private String sanctnerId;

    @Schema(description = "승인 여부")
    private String confmAt;

    @Schema(description = "승인 일시")
    private LocalDateTime sanctnDt;

    @Schema(description = "반려 사유")
    private String returnResn;

    @Schema(description = "약식 결재 ID")
    private String infrmlSanctnId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public static CongratulationDto from(Congratulation entity) {
        if (entity == null)
            return null;
        return CongratulationDto.builder()
                .congratulationId(entity.getCongratulationId())
                .userId(entity.getUserId())
                .congratulationCode(entity.getCongratulationCode())
                .requestDate(entity.getRequestDate())
                .congratulationName(entity.getCongratulationName())
                .trgterName(entity.getTrgterName())
                .birthday(entity.getBirthday())
                .occurrenceDate(entity.getOccurrenceDate())
                .relate(entity.getRelate())
                .remark(entity.getRemark())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .createdBy(entity.getFrstRegisterId())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}

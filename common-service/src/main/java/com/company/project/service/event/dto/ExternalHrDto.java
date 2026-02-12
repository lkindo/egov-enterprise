package com.company.project.service.event.dto;

import com.company.project.domain.event.ExternalHr;
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
@Schema(description = "외부 인력 정보 DTO")
public class ExternalHrDto {

    @Schema(description = "외부 인력 ID")
    private String extrlHrId;

    @Schema(description = "이벤트 ID")
    private String eventId;

    @Schema(description = "외부 인력 명")
    private String extrlHrNm;

    @Schema(description = "성별 코드")
    private String sexdstnCode;

    @Schema(description = "성별 명")
    private String sexdstnCodeNm;

    @Schema(description = "지역 번호")
    private String areaNo;

    @Schema(description = "중간 전화번호")
    private String middleTelno;

    @Schema(description = "끝 전화번호")
    private String endTelno;

    @Schema(description = "이메일 주소")
    private String emailAdres;

    @Schema(description = "직업 유형 코드")
    private String occpTyCode;

    @Schema(description = "직업 유형 명")
    private String occpTyCodeNm;

    @Schema(description = "생년월일")
    private String brth;

    @Schema(description = "소속 기관 명")
    private String psitnInsttNm;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static ExternalHrDto from(ExternalHr entity) {
        if (entity == null) return null;
        return ExternalHrDto.builder()
                .extrlHrId(entity.getExtrlHrId())
                .eventId(entity.getEventId())
                .extrlHrNm(entity.getExtrlHrNm())
                .sexdstnCode(entity.getSexdstnCode())
                .areaNo(entity.getAreaNo())
                .middleTelno(entity.getMiddleTelno())
                .endTelno(entity.getEndTelno())
                .emailAdres(entity.getEmailAdres())
                .occpTyCode(entity.getOccpTyCode())
                .brth(entity.getBrth())
                .psitnInsttNm(entity.getPsitnInsttNm())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}

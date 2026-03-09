package com.company.project.service.event.dto;

import com.company.project.domain.event.ExternalHr;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "외부 인사 정보 DTO")
public class ExternalHrDto {

    @Schema(description = "외부 인사 ID")
    private String extrlHrId;

    @Schema(description = "이벤트 ID")
    private String eventId;

    @Schema(description = "외부 인사 이름")
    private String extrlHrNm;

    @Schema(description = "성별 코드")
    private String sexdstnCode;

    @Schema(description = "지역 번호")
    private String areaNo;

    @Schema(description = "중간 전화번호")
    private String middleTelno;

    @Schema(description = "뒤쪽 전화번호")
    private String endTelno;

    @Schema(description = "이메일 주소")
    private String emailAdres;

    @Schema(description = "직업 유형 코드")
    private String occpTyCode;

    @Schema(description = "생년월일")
    private String brth;

    @Schema(description = "소속 기관명")
    private String psitnInsttNm;

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
                .build();
    }
}

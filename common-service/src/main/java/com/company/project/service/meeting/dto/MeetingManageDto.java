package com.company.project.service.meeting.dto;

import com.company.project.domain.meeting.MeetingManage;
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
@Schema(description = "?�의 관�??�보")
public class MeetingManageDto {

    @Schema(description = "?�의 ID")
    private String mtgId;

    @Schema(description = "?�의 명칭")
    private String mtgNm;

    @Schema(description = "?�의 ?�료 ?�용")
    private String mtgMtrCn;

    @Schema(description = "?�의 ?�번")
    private Integer mtgSn;

    @Schema(description = "?�의 ?�수")
    private Integer mtgCo;

    @Schema(description = "?�의 ?�자")
    private String mtgDe;

    @Schema(description = "?�의 ?�소")
    private String mtgPlace;

    @Schema(description = "?�의 ?�작 ?�간")
    private String mtgBeginTm;

    @Schema(description = "?�의 종료 ?�간")
    private String mtgEndTime;

    @Schema(description = "공개 ?�의 ?��?")
    private String clsdrMtgAt;

    @Schema(description = "?�람 ?�작 ?�자")
    private String readngBgnde;

    @Schema(description = "?�람 ?��?")
    private String readngAt;

    @Schema(description = "?�의 결과 ?�용")
    private String mtgResultCn;

    @Schema(description = "?�의 결과 ?�록 ?��?")
    private String mtgResultEnnc;

    @Schema(description = "기�? ?�항")
    private String etcMatter;

    @Schema(description = "주�? 부??ID")
    private String mngtDeptId;

    @Schema(description = "관리자 ID")
    private String mnaerId;

    @Schema(description = "관리자 부??ID")
    private String mnaerDeptId;

    @Schema(description = "?�의 ?�태")
    private String mtgAt;

    @Schema(description = "불참 ?�원??)")
    private Integer nonatdrnCo;

    @Schema(description = "참석 ?�원??)")
    private Integer atdrnCo;

    @Schema(description = "최초 ?�록??ID")
    private String frstRegisterId;

    @Schema(description = "최초 ?�록 ?�시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "최종 ?�정??ID")
    private String lastUpdusrId;

    @Schema(description = "최종 ?�정 ?�시")
    private LocalDateTime lastUpdusrPnttm;

    public static MeetingManageDto from(MeetingManage entity) {
        if (entity == null)
            return null;
        return MeetingManageDto.builder()
                .mtgId(entity.getMtgId())
                .mtgNm(entity.getMtgNm())
                .mtgMtrCn(entity.getMtgMtrCn())
                .mtgSn(entity.getMtgSn())
                .mtgCo(entity.getMtgCo())
                .mtgDe(entity.getMtgDe())
                .mtgPlace(entity.getMtgPlace())
                .mtgBeginTm(entity.getMtgBeginTm())
                .mtgEndTime(entity.getMtgEndTime())
                .clsdrMtgAt(entity.getClsdrMtgAt())
                .readngBgnde(entity.getReadngBgnde())
                .readngAt(entity.getReadngAt())
                .mtgResultCn(entity.getMtgResultCn())
                .mtgResultEnnc(entity.getMtgResultEnnc())
                .etcMatter(entity.getEtcMatter())
                .mngtDeptId(entity.getMngtDeptId())
                .mnaerId(entity.getMnaerId())
                .mnaerDeptId(entity.getMnaerDeptId())
                .mtgAt(entity.getMtgAt())
                .nonatdrnCo(entity.getNonatdrnCo())
                .atdrnCo(entity.getAtdrnCo())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}

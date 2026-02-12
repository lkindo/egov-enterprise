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
@Schema(description = "회의 관리 DTO")
public class MeetingManageDto {

    @Schema(description = "회의 ID")
    private String mtgId;

    @Schema(description = "회의 명")
    private String mtgNm;

    @Schema(description = "회의 안건 내용")
    private String mtgMtrCn;

    @Schema(description = "회의 순번")
    private Integer mtgSn;

    @Schema(description = "회의 참여인원")
    private Integer mtgCo;

    @Schema(description = "회의 일자")
    private String mtgDe;

    @Schema(description = "회의 장소")
    private String mtgPlace;

    @Schema(description = "회의 시작 시간")
    private String mtgBeginTm;

    @Schema(description = "회의 종료 시간")
    private String mtgEndTime;

    @Schema(description = "비공개 여부")
    private String clsdrMtgAt;

    @Schema(description = "회의 결과 내용")
    private String mtgResultCn;

    @Schema(description = "관리 부서 ID")
    private String mngtDeptId;

    @Schema(description = "담당자 ID")
    private String mnaerId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static MeetingManageDto from(MeetingManage entity) {
        if (entity == null) return null;
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
                .mtgResultCn(entity.getMtgResultCn())
                .mngtDeptId(entity.getMngtDeptId())
                .mnaerId(entity.getMnaerId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}

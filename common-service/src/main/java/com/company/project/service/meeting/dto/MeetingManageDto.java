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
@Schema(description = "Description")
public class MeetingManageDto {

    @Schema(description = "Description")
    private String mtgId;

    @Schema(description = "Description")
    private String mtgNm;

    @Schema(description = "Description")
    private String mtgMtrCn;

    @Schema(description = "Description")
    private Integer mtgSn;

    @Schema(description = "Description")
    private Integer mtgCo;

    @Schema(description = "Description")
    private String mtgDe;

    @Schema(description = "Description")
    private String mtgPlace;

    @Schema(description = "Description")
    private String mtgBeginTm;

    @Schema(description = "Description")
    private String mtgEndTime;

    @Schema(description = "Description")
    private String clsdrMtgAt;

    @Schema(description = "Description")
    private String mtgResultCn;

    @Schema(description = "Description")
    private String mngtDeptId;

    @Schema(description = "Description")
    private String mnaerId;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

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
                .mtgResultCn(entity.getMtgResultCn())
                .mngtDeptId(entity.getMngtDeptId())
                .mnaerId(entity.getMnaerId())
                .createdBy(entity.getFrstRegisterId())
                .createdDate(entity.getFrstRegisterPnttm())
                .build();
    }
}

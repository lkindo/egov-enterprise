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
@Schema(description = "?Œì˜ ê´€ë¦??•ë³´")
public class MeetingManageDto {

    @Schema(description = "?Œì˜ ID")
    private String mtgId;

    @Schema(description = "?Œì˜ ëª…ì¹­")
    private String mtgNm;

    @Schema(description = "?Œì˜ ?ë£Œ ?´ìš©")
    private String mtgMtrCn;

    @Schema(description = "?Œì˜ ?œë²ˆ")
    private Integer mtgSn;

    @Schema(description = "?Œì˜ ?Ÿìˆ˜")
    private Integer mtgCo;

    @Schema(description = "?Œì˜ ?¼ì")
    private String mtgDe;

    @Schema(description = "?Œì˜ ?¥ì†Œ")
    private String mtgPlace;

    @Schema(description = "?Œì˜ ?œì‘ ?œê°„")
    private String mtgBeginTm;

    @Schema(description = "?Œì˜ ì¢…ë£Œ ?œê°„")
    private String mtgEndTime;

    @Schema(description = "ê³µê°œ ?Œì˜ ?¬ë?")
    private String clsdrMtgAt;

    @Schema(description = "?´ëŒ ?œì‘ ?¼ì")
    private String readngBgnde;

    @Schema(description = "?´ëŒ ?¬ë?")
    private String readngAt;

    @Schema(description = "?Œì˜ ê²°ê³¼ ?´ìš©")
    private String mtgResultCn;

    @Schema(description = "?Œì˜ ê²°ê³¼ ?±ë¡ ?¬ë?")
    private String mtgResultEnnc;

    @Schema(description = "ê¸°í? ?¬í•­")
    private String etcMatter;

    @Schema(description = "ì£¼ê? ë¶€??ID")
    private String mngtDeptId;

    @Schema(description = "ê´€ë¦¬ì ID")
    private String mnaerId;

    @Schema(description = "ê´€ë¦¬ì ë¶€??ID")
    private String mnaerDeptId;

    @Schema(description = "?Œì˜ ?íƒœ")
    private String mtgAt;

    @Schema(description = "ë¶ˆì°¸ ?¸ì›??)
    private Integer nonatdrnCo;

    @Schema(description = "ì°¸ì„ ?¸ì›??)
    private Integer atdrnCo;

    @Schema(description = "ìµœì´ˆ ?±ë¡??ID")
    private String frstRegisterId;

    @Schema(description = "ìµœì´ˆ ?±ë¡ ?¼ì‹œ")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "ìµœì¢… ?˜ì •??ID")
    private String lastUpdusrId;

    @Schema(description = "ìµœì¢… ?˜ì • ?¼ì‹œ")
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

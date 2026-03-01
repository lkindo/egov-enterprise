package com.company.project.service.digitalassetmanagement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "ì§€???”ì²­ ?•ë³´")
public class KnowledgeRequestDto {
    @Schema(description = "ì§€??ID")
    private String knoId;
    @Schema(description = "ì§€??ëª…ì¹­")
    private String knoNm;
    @Schema(description = "ì§€???´ìš©")
    private String knoCn;
    @Schema(description = "ì§€??? í˜• ì½”ë“œ")
    private String knoTypeCd;
    @Schema(description = "ì¡°ì§(ë¶€?? ID")
    private String orgnztId;
    @Schema(description = "?„ë¬¸ê°€ ID")
    private String speId;
    @Schema(description = "?¬ìš©??ID")
    private String emplyrId;
    @Schema(description = "ì²¨ë? ?Œì¼ ID")
    private String atchFileId;
    @Schema(description = "?ìœ„ ì§ˆë¬¸/?µë? ID")
    private String ansParents;
    @Schema(description = "?µë? ê¹Šì´")
    private Integer ansDepth;
    @Schema(description = "?µë? ?œì„œ")
    private Integer ansSeq;
    @Schema(description = "?µë? ë²ˆí˜¸")
    private Long ansNumber;
    @Schema(description = "ìµœì´ˆ ?±ë¡??ID")
    private String frstRegisterId;
    @Schema(description = "ìµœì´ˆ ?±ë¡ ?¼ì‹œ")
    private LocalDateTime frstRegisterPnttm;
    @Schema(description = "ìµœì¢… ?˜ì •??ID")
    private String lastUpdusrId;
    @Schema(description = "ìµœì¢… ?˜ì • ?¼ì‹œ")
    private LocalDateTime lastUpdusrPnttm;
}

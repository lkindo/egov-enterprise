package nuri.business.service.knowledge.dto;

import nuri.business.domain.knowledge.Knowledge;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 吏DTO
 */
@Getter
@Builder
public class KnowledgeDto {
    private String knoId;
    private String orgnztId;
    private String emplyrId;
    private String knoTypeCd;
    private String knoNm;
    private String knoCn;
    private String othbcAt;
    private String colYmd;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static KnowledgeDto from(Knowledge entity) {
        return KnowledgeDto.builder()
                .knoId(entity.getKnoId())
                .orgnztId(entity.getOrgnztId())
                .emplyrId(entity.getEmplyrId())
                .knoTypeCd(entity.getKnoTypeCd())
                .knoNm(entity.getKnoNm())
                .knoCn(entity.getKnoCn())
                .othbcAt(entity.getOthbcAt())
                .colYmd(entity.getColYmd())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}

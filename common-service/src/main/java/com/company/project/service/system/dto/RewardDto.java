package com.company.project.service.system.dto;

import com.company.project.domain.system.Reward;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardDto {
    private String rwardId;
    private String rwardManId;
    private String rwardCd;
    private String rwardDe;
    private String rwardNm;
    private String pblenCn;
    private String sanctnerId;
    private String confmAt;
    private String sanctnDt;
    private String returnResn;
    private String atchFileId;
    private String infrmlSanctnId;
    private String createdBy;
    private LocalDateTime createdDate;

    public static RewardDto from(Reward entity) {
        return RewardDto.builder()
                .rwardId(entity.getRwardId())
                .rwardManId(entity.getRwardManId())
                .rwardCd(entity.getRwardCd())
                .rwardDe(entity.getRwardDe())
                .rwardNm(entity.getRwardNm())
                .pblenCn(entity.getPblenCn())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .atchFileId(entity.getAtchFileId())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}

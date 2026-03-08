package com.company.project.service.reward.dto;

import com.company.project.domain.reward.Reward;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardDto {
    private String rwardId;
    private String rwardwnrId;
    private String rwardCode;
    private String rwardDe;
    private String rwardNm;
    private String pblenCn;
    private String sanctnerId;
    private String confmAt;
    private LocalDateTime sanctnDt;
    private String returnResn;
    private String atchFileId;
    private String infrmlSanctnId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static RewardDto from(Reward entity) {
        if (entity == null)
            return null;
        return RewardDto.builder()
                .rwardId(entity.getRwardId())
                .rwardwnrId(entity.getRwardwnrId())
                .rwardCode(entity.getRwardCode())
                .rwardDe(entity.getRwardDe())
                .rwardNm(entity.getRwardNm())
                .pblenCn(entity.getPblenCn())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .atchFileId(entity.getAtchFileId())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegistPnttm())
                .build();
    }
}

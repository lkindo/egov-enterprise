package nuri.foundation.service.operation.dto;

import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardManageDto {
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
    @Size(max = 30)
    private String atchFileId;
    private String informlSanctnId;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
}

package nuri.foundation.service.system.service.survey.dto;

import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QustnrInfoDto implements Serializable {
    private String qustnrId;
    private String qustnrSj;
    private String qustnrPurps;
    private String qustnrWritngGuidanceCn;
    private String qustnrBeginDe;
    private String qustnrEndDe;
    private String qustnrTrget;
    private String qustnrTmplatId;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
}

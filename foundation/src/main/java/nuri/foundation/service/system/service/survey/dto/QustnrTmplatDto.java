package nuri.foundation.service.system.service.survey.dto;

import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QustnrTmplatDto implements Serializable {
    private String qustnrTmplatId;
    private String qustnrTmplatTy;
    private String qustnrTmplatDc;
    private String qustnrTmplatPathNm;
    private String qustnrTmplatImageInfo;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
}

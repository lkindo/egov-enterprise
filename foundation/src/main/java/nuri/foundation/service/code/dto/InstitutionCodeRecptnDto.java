package nuri.foundation.service.code.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstitutionCodeRecptnDto {
    private String occrrncDe;
    private String insttCode;
    private Long opertSn;
    private String changeSeCode;
    private String processSe;
    private String etcCode;
    private String allInsttNm;
    private String lowestInsttNm;
    private String telno;
    private String fxnum;
    private String creatDe;
    private String ablDe;
    private String ablEnnc;
    private LocalDateTime frstRegistPnttm;
    private String frstRegisterId;
}

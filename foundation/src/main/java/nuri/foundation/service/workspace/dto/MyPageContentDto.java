package nuri.foundation.service.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyPageContentDto {
    private String cntntsId;
    private String cntntsNm;
    private String cntcUrl;
    private String cntntsUseAt;
    private String cntntsLinkUrl;
    private String cntntsDc;
}

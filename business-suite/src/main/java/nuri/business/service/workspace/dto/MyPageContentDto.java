package nuri.business.service.workspace.dto;

import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyPageContentDto {
    @Size(max = 20)
    private String cntntsId;
    @Size(max = 100)
    private String cntntsNm;
    private String cntcUrl;
    private String cntntsUseAt;
    private String cntntsLinkUrl;
    private String cntntsDc;
}

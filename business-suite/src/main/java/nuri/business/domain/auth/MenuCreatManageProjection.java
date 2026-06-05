package nuri.business.domain.auth;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MenuCreatManageProjection {
    private String authrtCd;
    private String authrtNm;
    private String authrtExpln;
    private String authrtCrtYmd;
    private Long chkYeoBu;
}

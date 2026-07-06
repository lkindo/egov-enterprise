package nuri.business.domain.auth;

import lombok.*;
import lombok.Builder;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MenuAuthorityProjection {
    private String authrtCd;
    private Long menuSn;
    private String menuNm;
    private Long upperMenuSn;
    private String regYn;
}

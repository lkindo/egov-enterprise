package nuri.foundation.domain.auth;

import lombok.*;
import lombok.Builder;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MenuAuthorityProjection {
    private String authorCode;
    private Long menuNo;
    private String menuNm;
    private Long upperMenuNo;
    private String regYn;
}

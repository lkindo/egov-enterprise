package nuri.foundation.domain.auth;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthorRoleProjection {
    private String roleId;
    private String roleNm;
    private String rolePatrn;
    private String roleExpln;
    private String roleTypeCd;
    private String roleSort;
    private String authrtCd;
    private String regYn;
    private LocalDateTime creatDt;
}

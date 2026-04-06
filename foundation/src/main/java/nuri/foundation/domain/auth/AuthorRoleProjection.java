package nuri.foundation.domain.auth;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthorRoleProjection {
    private String roleCode;
    private String roleNm;
    private String rolePtn;
    private String roleDc;
    private String roleTyp;
    private String roleSort;
    private String authorCode;
    private String regYn;
    private LocalDateTime creatDt;
}

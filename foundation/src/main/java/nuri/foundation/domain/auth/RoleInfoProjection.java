package nuri.foundation.domain.auth;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoleInfoProjection {
    private String roleCode;
    private String roleNm;
    private String rolePttrn;
    private String roleDc;
    private String roleTy;
    private String roleTyNm;
    private Integer roleSort;
    private java.time.LocalDate creatDt;
}

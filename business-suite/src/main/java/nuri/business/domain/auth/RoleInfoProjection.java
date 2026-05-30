package nuri.business.domain.auth;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoleInfoProjection {
    private String roleId;
    private String roleNm;
    private String rolePatrn;
    private String roleExpln;
    private String roleTypeCd;
    private String roleTyNm;
    private Integer roleSort;
    private java.time.LocalDate creatDt;
}

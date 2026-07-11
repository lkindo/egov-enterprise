package nuri.business.domain.auth;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptAuthorProjection {
    private String deptCode;
    private String deptNm;
    private String userId;
    private String userNm;

    private String authrtId;
    private String scrtyDcsnTrgtId;
    private String regYn;
}


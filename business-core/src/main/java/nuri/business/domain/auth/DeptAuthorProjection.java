package nuri.business.domain.auth;

import io.swagger.v3.oas.annotations.media.Schema;
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

    @Schema(nullable = true, types = {"string", "null"})
    private String authrtId;
    private String scrtyDcsnTrgtId;
    private String regYn;
}


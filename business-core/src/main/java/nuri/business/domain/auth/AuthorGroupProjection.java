package nuri.business.domain.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthorGroupProjection {
    private String userId;
    private String userNm;
    @Schema(nullable = true, types = {"string", "null"})
    private String groupId;
    private String mbrTypeCd;
    @Schema(nullable = true, types = {"string", "null"})
    private String mberTyNm;
    @Schema(nullable = true, types = {"string", "null"})
    private String authrtId;
    private String regYn;
    private String scrtyDcsnTrgtId;
}

package nuri.business.domain.auth;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthorGroupProjection {
    private String userId;
    private String userNm;
    private String groupId;
    private String mbrTypeCd;
    private String mberTyNm;
    private String authrtId;
    private String regYn;
    private String scrtyDcsnTrgtId;
}

package nuri.business.domain.auth;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserAuthorityId implements Serializable {
    private static final long serialVersionUID = 1L;
    private String scrtyDcsnTrgtId;
    private String authrtId;
}

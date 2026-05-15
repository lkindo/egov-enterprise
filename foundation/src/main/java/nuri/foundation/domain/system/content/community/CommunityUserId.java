package nuri.foundation.domain.system.content.community;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CommunityUserId implements Serializable {

    @Column(name = "CMNTY_ID", length = 20, nullable = false)
    private String cmntyId;

    @Column(name = "USER_ID", length = 30, nullable = false)
    private String userId;
}

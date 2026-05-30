package nuri.business.domain.system.content.community;

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

    @Column(name = "cmnty_id", length = 20, nullable = false)
    private String cmntyId;

    @Column(name = "user_id", length = 30, nullable = false)
    private String userId;
}

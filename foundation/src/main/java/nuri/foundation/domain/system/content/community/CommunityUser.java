package nuri.foundation.domain.system.content.community;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NCMMNTYUSER")
@SuperBuilder
public class CommunityUser extends BaseEntity implements Serializable {

    @EmbeddedId
    private CommunityUserId id;

    @Column(name = "MNGR_AT", length = 1)
    private String mngrAt;

    @Column(name = "SBSCRB_DE")
    private LocalDateTime sbscrbDe;

    @Column(name = "SECSN_DE")
    private LocalDateTime secsnDe;

    @Column(name = "MBER_STTUS", length = 15)
    private String mberSttus;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public void approve() {
        this.mberSttus = "P"; // Example status for approved
    }

    public void withdraw() {
        this.useAt = "N";
        this.secsnDe = LocalDateTime.now();
        this.mngrAt = "N";
    }

    public void grantAdmin() {
        this.mngrAt = "Y";
    }

    public void revokeAdmin() {
        this.mngrAt = "N";
    }
}

package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalTemporaryDraftReferenceId implements Serializable {
    private static final long serialVersionUID = 1L;

    @Column(name = "ifml_atrz_tmpr_strg_sn", nullable = false)
    private Long ifmlAtrzTmprStrgSn;
    @Column(name = "user_id", length = 20, nullable = false)
    private String userId;

    public ApprovalTemporaryDraftReferenceId(Long ifmlAtrzTmprStrgSn, String userId) {
        this.ifmlAtrzTmprStrgSn = Objects.requireNonNull(ifmlAtrzTmprStrgSn);
        this.userId = Objects.requireNonNull(userId);
    }
}

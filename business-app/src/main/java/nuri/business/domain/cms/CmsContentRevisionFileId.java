package nuri.business.domain.cms;

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
public class CmsContentRevisionFileId implements Serializable {
    private static final long serialVersionUID = 1L;

    @Column(name = "conts_rvsn_sn", nullable = false)
    private Long contsRvsnSn;
    @Column(name = "conts_file_sn", nullable = false)
    private Long contsFileSn;

    public CmsContentRevisionFileId(Long contsRvsnSn, Long contsFileSn) {
        this.contsRvsnSn = Objects.requireNonNull(contsRvsnSn);
        this.contsFileSn = Objects.requireNonNull(contsFileSn);
    }
}

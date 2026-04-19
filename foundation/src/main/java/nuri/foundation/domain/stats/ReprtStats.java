package nuri.foundation.domain.stats;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 보고서 통계 JPA Entity
 * [Audit] BaseEntity 상속을 통해 표준 감사 필드 사용
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NREPRTSTATS")
@SuperBuilder
public class ReprtStats extends BaseEntity {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String reprtId;

    @Column(name = "REPRT_NM", length = 255)
    private String reprtNm;

    @Column(name = "REPRT_STTUS", length = 1)
    private String reprtSttus;

    @Column(name = "REPRT_TY", length = 1)
    private String reprtTy;
}

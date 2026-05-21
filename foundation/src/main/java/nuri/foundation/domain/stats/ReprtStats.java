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
@Table(name = "tb_rptp_stats")
@SuperBuilder
public class ReprtStats extends BaseEntity {

    @Id
    @Column(name = "reprt_id", length = 20)
    private String reprtId;

    @Column(name = "reprt_nm", length = 255)
    private String reprtNm;

    @Column(name = "reprt_sttus", length = 1)
    private String reprtSttus;

    @Column(name = "reprt_ty", length = 1)
    private String reprtTy;
}

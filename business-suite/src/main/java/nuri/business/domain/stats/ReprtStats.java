package nuri.business.domain.stats;

import nuri.business.domain.common.BaseEntity;
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
    @Column(length = 20)
    private String reprtId;

    @Column(length = 255)
    private String reprtNm;

    @Column(length = 1)
    private String reprtSttus;

    @Column(length = 1)
    private String reprtType;
}

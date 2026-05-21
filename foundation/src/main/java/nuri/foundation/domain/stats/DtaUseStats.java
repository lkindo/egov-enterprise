package nuri.foundation.domain.stats;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 데이터 사용 통계 JPA Entity
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_dta_use_stats")
@SuperBuilder
public class DtaUseStats extends BaseEntity {

    @Id
    @Column(name = "dta_use_stats_id", length = 20)
    private String dtaUseStatsId;

    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(name = "ntt_id")
    private Long nttId;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "file_sn")
    private Integer fileSn;

}

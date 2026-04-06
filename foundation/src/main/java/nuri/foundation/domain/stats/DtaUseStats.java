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
 * 癒┷곸뒠袁れ넺 JPA Entity
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NDTAUSESTATS")
@SuperBuilder
public class DtaUseStats extends BaseEntity {

    @Id
    @Column(name = "DTA_USE_STATS_ID", length = 20)
    private String dtaUseStatsId;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "NTT_ID")
    private Long nttId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FILE_SN")
    private Integer fileSn;

}

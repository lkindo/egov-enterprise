package nuri.business.domain.stats;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
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
public class DtaUseStats extends BaseEntity {

    @Id
    @Column(length = 20)
    private String dtaUseStatsId;

    @Column(length = 20)
    private String bbsId;

        private Long pstId;

    @Column(length = 20)
    private String atchFileId;

    private Integer fileSn;

    // 빌더 전용 생성자: 클래스 레벨 @SuperBuilder 제거에 따른 정적 팩토리 위임 대상
    private DtaUseStats(String dtaUseStatsId, String bbsId, Long pstId, String atchFileId, Integer fileSn) {
        this.dtaUseStatsId = dtaUseStatsId;
        this.bbsId = bbsId;
        this.pstId = pstId;
        this.atchFileId = atchFileId;
        this.fileSn = fileSn;
    }

    /**
     * 빌더 진입점 (기존 DtaUseStats.builder()...build() 호출 형태를 그대로 유지).
     * 감사 필드(frstRgtrId/lastMdfrId/crtDt/mdfcnDt)는 JPA Auditing 이 채우므로 제외한다.
     */
    @Builder
    public static DtaUseStats create(String dtaUseStatsId, String bbsId, Long pstId, String atchFileId, Integer fileSn) {
        return new DtaUseStats(dtaUseStatsId, bbsId, pstId, atchFileId, fileSn);
    }

}

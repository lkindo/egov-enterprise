package nuri.business.domain.stats;
import nuri.foundation.domain.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
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
@Entity
@Table(name = "tb_dta_use_stats")
public class DtaUseStats extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long dtaUseStatsSn;

    @Column(length = 20)
    private String bbsId;

    // [V2_69] 게시글 자동 PK와 참조 계약을 BIGINT로 통일한다.
    @Column
    private Long pstSn;

    @Column(length = 20)
    private String atchFileId;

    private Integer fileSn;

    // 빌더 전용 생성자: 클래스 레벨 @SuperBuilder 제거에 따른 정적 팩토리 위임 대상
    private DtaUseStats(String bbsId, Long pstSn, String atchFileId, Integer fileSn) {
        this.bbsId = bbsId;
        this.pstSn = pstSn;
        this.atchFileId = atchFileId;
        this.fileSn = fileSn;
    }

    /**
     * 빌더 진입점 (기존 DtaUseStats.builder()...build() 호출 형태를 그대로 유지).
     * 감사 필드(frstRgtrId/lastMdfrId/crtDt/mdfcnDt)는 JPA Auditing 이 채우므로 제외한다.
     */
    @Builder
    public static DtaUseStats create(String bbsId, Long pstSn, String atchFileId, Integer fileSn) {
        return new DtaUseStats(bbsId, pstSn, atchFileId, fileSn);
    }

}

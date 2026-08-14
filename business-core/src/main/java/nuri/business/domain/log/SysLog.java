package nuri.business.domain.log;
import nuri.foundation.domain.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 시스템 로그 엔티티 (tb_sys_log)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_sys_log", uniqueConstraints =
        @UniqueConstraint(name = "uk_tb_sys_log_dmnd_id", columnNames = "dmnd_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SysLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sys_log_sn", updatable = false, nullable = false)
    private Long sysLogSn;

    @Column(length = 20, nullable = false)
    private String dmndId;

    @Column(length = 100)
    private String srvcNm;

    @Column(length = 100)
    private String mthdNm;

    @Column(length = 12)
    private String prcsSeCd;

    // [V2_16] varchar(14)→bigint 타입 통일: 의미는 tb_web_log.prcs_tm 과 동일한 '처리 소요시간(ms)' 실측 확정
    private Long prcsTm;

    @Column(length = 20)
    private String dmndUserId;

    @Column(length = 30)
    private String dmndUserIpAddr;

    @Column(length = 8)
    private String ocrnYmd;

    @Column(length = 12)
    private String rspnsCd;

    @Column(length = 12)
    private String errCd;

    @Column(length = 12)
    private String errSeCd;

    private SysLog(Long sysLogSn, String dmndId, String srvcNm, String mthdNm, String prcsSeCd, Long prcsTm,
            String dmndUserId, String dmndUserIpAddr, String ocrnYmd, String rspnsCd, String errCd, String errSeCd) {
        this.sysLogSn = sysLogSn;
        this.dmndId = dmndId;
        this.srvcNm = srvcNm;
        this.mthdNm = mthdNm;
        this.prcsSeCd = prcsSeCd;
        this.prcsTm = prcsTm;
        this.dmndUserId = dmndUserId;
        this.dmndUserIpAddr = dmndUserIpAddr;
        this.ocrnYmd = ocrnYmd;
        this.rspnsCd = rspnsCd;
        this.errCd = errCd;
        this.errSeCd = errSeCd;
    }

    @Builder
    public static SysLog create(Long sysLogSn, String dmndId, String srvcNm, String mthdNm, String prcsSeCd, Long prcsTm,
            String dmndUserId, String dmndUserIpAddr, String ocrnYmd, String rspnsCd, String errCd, String errSeCd) {
        return new SysLog(sysLogSn, dmndId, srvcNm, mthdNm, prcsSeCd, prcsTm, dmndUserId, dmndUserIpAddr, ocrnYmd, rspnsCd, errCd, errSeCd);
    }
}

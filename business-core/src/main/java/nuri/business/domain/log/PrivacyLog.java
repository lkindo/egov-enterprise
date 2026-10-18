package nuri.business.domain.log;
import nuri.foundation.domain.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 개인정보 조회 로그 엔티티 (tb_privacy_log)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_privacy_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrivacyLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prvc_log_sn")
    private Long prvcLogSn;

    @Column(length = 20, nullable = false, unique = true)
    private String dmndId;

    private LocalDateTime inqDt;

    @Column(length = 100)
    private String srvcNm;

    @Column(length = 255)
    private String inqInfo;

    @Column(length = 20)
    private String dmndUserId;

    @Column(length = 45)
    private String dmndUserIpAddr;

    /**
     * 대상자아이디(2026-10-18, V2_131) — 조회한 개인정보의 주인(정보주체)의 내부 키 esntlId. 한 사람을 대상으로 한 조회만
     * 채우고 목록 조회는 비운다. 조회자는 {@link #dmndUserId}(loginId)다 — 두 칸의 정체성 축이 다르다.
     */
    @Column(name = "trpr_id", length = 20)
    private String trprId;

    private PrivacyLog(Long prvcLogSn, String dmndId, LocalDateTime inqDt, String srvcNm, String inqInfo,
            String dmndUserId, String dmndUserIpAddr, String trprId) {
        this.prvcLogSn = prvcLogSn;
        this.dmndId = dmndId;
        this.inqDt = inqDt;
        this.srvcNm = srvcNm;
        this.inqInfo = inqInfo;
        this.dmndUserId = dmndUserId;
        this.dmndUserIpAddr = dmndUserIpAddr;
        this.trprId = trprId;
    }

    @Builder
    public static PrivacyLog create(Long prvcLogSn, String dmndId, LocalDateTime inqDt, String srvcNm, String inqInfo,
            String dmndUserId, String dmndUserIpAddr, String trprId) {
        return new PrivacyLog(prvcLogSn, dmndId, inqDt, srvcNm, inqInfo, dmndUserId, dmndUserIpAddr, trprId);
    }
}

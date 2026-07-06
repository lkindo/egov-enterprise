package nuri.business.domain.log;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 개인정보 조회 로그 엔티티 (tb_privacy_log)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_privacy_log")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrivacyLog extends BaseEntity {

    @Id
    @Column(length = 20)
    private String dmndId;

    private LocalDateTime inqDt;

    @Column(length = 100)
    private String srvcNm;

    @Column(length = 255)
    private String inqInfo;

    @Column(length = 20)
    private String dmndUserId;

    @Column(length = 30)
    private String dmndUserIpAddr;

    private PrivacyLog(String dmndId, LocalDateTime inqDt, String srvcNm, String inqInfo,
            String dmndUserId, String dmndUserIpAddr) {
        this.dmndId = dmndId;
        this.inqDt = inqDt;
        this.srvcNm = srvcNm;
        this.inqInfo = inqInfo;
        this.dmndUserId = dmndUserId;
        this.dmndUserIpAddr = dmndUserIpAddr;
    }

    @Builder
    public static PrivacyLog create(String dmndId, LocalDateTime inqDt, String srvcNm, String inqInfo,
            String dmndUserId, String dmndUserIpAddr) {
        return new PrivacyLog(dmndId, inqDt, srvcNm, inqInfo, dmndUserId, dmndUserIpAddr);
    }
}

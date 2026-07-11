package nuri.business.domain.log;
import nuri.foundation.domain.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 웹 로그 엔티티 (tb_web_log)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_web_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WebLog extends BaseEntity {

    @Id
    @Column(length = 20)
    private String dmndId;

    @Column(length = 1000)
    private String url;

    @Column(length = 20)
    private String dmndUserId;

    @Column(length = 30)
    private String dmndUserIpAddr;

    @Column(length = 8)
    private String occrYmd;

    private Long prcsTm;

    private WebLog(String dmndId, String url, String dmndUserId, String dmndUserIpAddr, String occrYmd, Long prcsTm) {
        this.dmndId = dmndId;
        this.url = url;
        this.dmndUserId = dmndUserId;
        this.dmndUserIpAddr = dmndUserIpAddr;
        this.occrYmd = occrYmd;
        this.prcsTm = prcsTm;
    }

    @Builder
    public static WebLog create(String dmndId, String url, String dmndUserId, String dmndUserIpAddr, String occrYmd, Long prcsTm) {
        return new WebLog(dmndId, url, dmndUserId, dmndUserIpAddr, occrYmd, prcsTm);
    }
}

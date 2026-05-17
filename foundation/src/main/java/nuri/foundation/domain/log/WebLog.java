package nuri.foundation.domain.log;
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
import java.time.LocalDateTime;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_WEB_LOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class WebLog extends BaseEntity {

    @Id
    @Column(name = "DMND_ID", length = 20)
    private String dmndId;

    @Column(name = "URL", length = 200)
    private String url;

    @Column(name = "DMND_USER_ID", length = 20)
    private String dmndUserId;

    @Column(name = "DMND_USER_IP_ADDR", length = 30)
    private String rqesterIp;

    @Column(name = "OCCR_YMD", length = 8)
    private String ocrnYmd;

    @jakarta.persistence.Transient
    private Long prcsTm;

    public WebLog(String dmndId, String url, String dmndUserId, String rqesterIp, String ocrnYmd, Long prcsTm) {
        this.dmndId = dmndId;
        this.url = url;
        this.dmndUserId = dmndUserId;
        this.rqesterIp = rqesterIp;
        this.ocrnYmd = ocrnYmd;
        this.prcsTm = prcsTm;
    }
}

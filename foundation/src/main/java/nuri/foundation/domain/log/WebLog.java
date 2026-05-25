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

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_web_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class WebLog extends BaseEntity {

    @Id
    @Column(name = "dmnd_id", length = 20)
    private String dmndId;

    @Column(length = 1000)
    private String url;

    @Column(length = 20)
    private String dmndUserId;

    @Column(length = 30)
    private String dmndUserIpAddr;

    @Column(length = 8)
    private String occrYmd;

    @jakarta.persistence.Transient
    private Long prcsTm;

    public WebLog(String dmndId, String url, String dmndUserId, String dmndUserIpAddr, String occrYmd, Long prcsTm) {
        this.dmndId = dmndId;
        this.url = url;
        this.dmndUserId = dmndUserId;
        this.dmndUserIpAddr = dmndUserIpAddr;
        this.occrYmd = occrYmd;
        this.prcsTm = prcsTm;
    }

    // ----- [Legacy Aliases] -----

    public String getRqesterIp() {
        return this.dmndUserIpAddr;
    }

    public String getOcrnYmd() {
        return this.occrYmd;
    }
}

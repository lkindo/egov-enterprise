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
@Table(name = "NWEBLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class WebLog extends BaseEntity {

    @Id
    @Column(name = "REQUST_ID", length = 20)
    private String requstId;

    @Column(name = "URL", length = 200)
    private String url;

    @Column(name = "RQESTER_ID", length = 20)
    private String rqesterId;

    @Column(name = "RQESTER_IP", length = 23)
    private String rqesterIp;

    @Column(name = "OCCRRNC_DE")
    private LocalDateTime occrrncDe;

    public WebLog(String requstId, String url, String rqesterId, String rqesterIp, LocalDateTime occrrncDe) {
        this.requstId = requstId;
        this.url = url;
        this.rqesterId = rqesterId;
        this.rqesterIp = rqesterIp;
        this.occrrncDe = occrrncDe;
    }
}

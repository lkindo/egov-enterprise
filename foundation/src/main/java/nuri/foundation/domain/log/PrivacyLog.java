package nuri.foundation.domain.log;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import java.time.LocalDateTime;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_privacy_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PrivacyLog extends BaseEntity {

    @Id
    @Column(name = "dmnd_id", length = 20)
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

    public static abstract class PrivacyLogBuilder<C extends PrivacyLog, B extends PrivacyLogBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String dmndId;
        private String dmndUserId;
        private LocalDateTime inqDt;
        private String inqInfo;
        private String srvcNm;
        private String dmndUserIpAddr;

        public B requestId(String requestId) {
            this.dmndId = requestId;
            return self();
        }

        public B requesterId(String requesterId) {
            this.dmndUserId = requesterId;
            return self();
        }

        public B inquiryDatetime(LocalDateTime inquiryDatetime) {
            this.inqDt = inquiryDatetime;
            return self();
        }

        public B inquiryInfo(String inquiryInfo) {
            this.inqInfo = inquiryInfo;
            return self();
        }

        public B serviceName(String serviceName) {
            this.srvcNm = serviceName;
            return self();
        }

        public B requesterIp(String requesterIp) {
            this.dmndUserIpAddr = requesterIp;
            return self();
        }
    }

    // ----- [Legacy Aliases] -----

    public String getRequestId() {
        return this.dmndId;
    }

    public void setRequestId(String requestId) {
        this.dmndId = requestId;
    }

    public LocalDateTime getInquiryDatetime() {
        return this.inqDt;
    }

    public void setInquiryDatetime(LocalDateTime inquiryDatetime) {
        this.inqDt = inquiryDatetime;
    }

    public String getServiceName() {
        return this.srvcNm;
    }

    public void setServiceName(String serviceName) {
        this.srvcNm = serviceName;
    }

    public String getInquiryInfo() {
        return this.inqInfo;
    }

    public void setInquiryInfo(String inquiryInfo) {
        this.inqInfo = inquiryInfo;
    }

    public String getRequesterId() {
        return this.dmndUserId;
    }

    public void setRequesterId(String requesterId) {
        this.dmndUserId = requesterId;
    }

    public String getRequesterIp() {
        return this.dmndUserIpAddr;
    }

    public void setRequesterIp(String requesterIp) {
        this.dmndUserIpAddr = requesterIp;
    }
}

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
@Table(name = "TB_PRIVACY_LOG")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PrivacyLog extends BaseEntity {

    @Id
    @Column(name = "DMND_ID", length = 20)
    private String requestId;

    @Column(name = "INQIRE_DT")
    private LocalDateTime inquiryDatetime;

    @Column(name = "SRVC_NM", length = 255)
    private String serviceName;

    @Column(name = "INQ_INFO", length = 255)
    private String inquiryInfo;

    @Column(name = "DMND_USER_ID", length = 20)
    private String requesterId;

    @Column(name = "DMND_USER_IP_ADDR", length = 30)
    private String requesterIp;
}

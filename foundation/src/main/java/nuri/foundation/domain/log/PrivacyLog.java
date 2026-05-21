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
    private String requestId;

    @Column(name = "inq_dt")
    private LocalDateTime inquiryDatetime;

    @Column(name = "srvc_nm", length = 100)
    private String serviceName;

    @Column(name = "inq_info", length = 255)
    private String inquiryInfo;

    @Column(name = "dmnd_user_id", length = 20)
    private String requesterId;

    @Column(name = "dmnd_user_ip_addr", length = 30)
    private String requesterIp;
}

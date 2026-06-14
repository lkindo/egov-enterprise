package nuri.business.domain.log;
import nuri.business.domain.common.BaseEntity;
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

}

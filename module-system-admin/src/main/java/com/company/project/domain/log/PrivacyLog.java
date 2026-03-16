package com.company.project.domain.log;
import com.company.project.domain.common.BaseEntity;
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
@Table(name = "NPRIVACYLOG")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PrivacyLog extends BaseEntity {

    @Id
    @Column(name = "REQUST_ID", length = 20)
    private String requestId;

    @Column(name = "INQIRE_DT")
    private LocalDateTime inquiryDatetime;

    @Column(name = "SRVC_NM", length = 255)
    private String serviceName;

    @Column(name = "INQIRE_INFO", length = 255)
    private String inquiryInfo;

    @Column(name = "RQESTER_ID", length = 20)
    private String requesterId;

    @Column(name = "RQESTER_IP", length = 23)
    private String requesterIp;
}

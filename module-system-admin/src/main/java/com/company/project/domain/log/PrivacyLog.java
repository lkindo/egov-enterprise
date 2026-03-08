package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "NPRIVACYLOG")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrivacyLog {

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

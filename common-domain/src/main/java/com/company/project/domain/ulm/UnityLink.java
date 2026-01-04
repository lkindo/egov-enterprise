package com.company.project.domain.ulm;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity
@Table(name = "COMTNUNITYLINK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
public class UnityLink {

    @Id
    @Column(name = "UNITY_LINK_ID", length = 20)
    private String unityLinkId;

    @Column(name = "UNITY_LINK_SE_CODE", length = 3)
    private String unityLinkSeCode;

    @Column(name = "UNITY_LINK_NM", length = 255)
    private String unityLinkNm;

    @Column(name = "UNITY_LINK_URL", length = 255)
    private String unityLinkUrl;

    @Column(name = "UNITY_LINK_DC", length = 1000)
    private String unityLinkDc;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @PrePersist
    protected void onCreate() {
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}

package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NUNITYLINK")
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

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public UnityLink(String unityLinkId, String unityLinkSeCode, String unityLinkNm, String unityLinkUrl,
            String unityLinkDc, String frstRegisterId) {
        this.unityLinkId = unityLinkId;
        this.unityLinkSeCode = unityLinkSeCode;
        this.unityLinkNm = unityLinkNm;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDc = unityLinkDc;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String unityLinkSeCode, String unityLinkNm, String unityLinkUrl, String unityLinkDc,
            String lastUpdusrId) {
        this.unityLinkSeCode = unityLinkSeCode;
        this.unityLinkNm = unityLinkNm;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDc = unityLinkDc;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}

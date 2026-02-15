package com.company.project.domain.notification;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity(name = "NotificationUnityLink")
@Table(name = "NUNITYLINK")
public class UnityLink extends BaseEntity {

    @Id
    @Column(name = "UNITY_LINK_ID", length = 20)
    private String unityLinkId;

    @Column(name = "UNITY_LINK_GROUP", length = 255)
    private String unityLinkGroup;

    @Column(name = "UNITY_LINK_NM", length = 255)
    private String unityLinkNm;

    @Column(name = "UNITY_LINK_URL", length = 255)
    private String unityLinkUrl;

    @Column(name = "UNITY_LINK_DC", length = 2500)
    private String unityLinkDc;

    @Column(name = "UNITY_LINK_SE_CODE", length = 3)
    private String unityLinkSeCode;

    @Builder
    public UnityLink(String unityLinkId, String unityLinkGroup, String unityLinkNm, String unityLinkUrl,
            String unityLinkDc, String unityLinkSeCode, String frstRegisterId) {
        this.unityLinkId = unityLinkId;
        this.unityLinkGroup = unityLinkGroup;
        this.unityLinkNm = unityLinkNm;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDc = unityLinkDc;
        this.unityLinkSeCode = unityLinkSeCode;
        this.createdBy = frstRegisterId;
    }

    public void update(String unityLinkSeCode, String unityLinkNm, String unityLinkUrl, String unityLinkDc,
            String userId) {
        this.unityLinkSeCode = unityLinkSeCode;
        this.unityLinkNm = unityLinkNm;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDc = unityLinkDc;
        this.lastModifiedBy = userId;
    }

    public void update(String unityLinkGroup, String unityLinkSeCode, String unityLinkNm, String unityLinkUrl,
            String unityLinkDc, String userId) {
        this.unityLinkGroup = unityLinkGroup;
        this.unityLinkSeCode = unityLinkSeCode;
        this.unityLinkNm = unityLinkNm;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDc = unityLinkDc;
        this.lastModifiedBy = userId;
    }
}

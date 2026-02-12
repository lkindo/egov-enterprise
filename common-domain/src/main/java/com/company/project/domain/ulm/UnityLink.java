package com.company.project.domain.ulm;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 통합 링크 정보 Entity
 * 레거시 테이블: NUNITYLINK
 */
@Entity
@Table(name = "NUNITYLINK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UnityLink extends BaseEntity {

    @Id
    @Column(name = "UNITY_LINK_ID", length = 20)
    private String unityLinkId;

    @Column(name = "UNITY_LINK_SE_CODE", length = 3, nullable = false)
    private String unityLinkSeCode;

    @Column(name = "UNITY_LINK_NM", length = 255, nullable = false)
    private String unityLinkNm;

    @Column(name = "UNITY_LINK_URL", length = 255, nullable = false)
    private String unityLinkUrl;

    @Column(name = "UNITY_LINK_DC", length = 1000)
    private String unityLinkDc;

    @Builder
    public UnityLink(String unityLinkId, String unityLinkSeCode, String unityLinkNm,
                    String unityLinkUrl, String unityLinkDc) {
        this.unityLinkId = unityLinkId;
        this.unityLinkSeCode = unityLinkSeCode;
        this.unityLinkNm = unityLinkNm;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDc = unityLinkDc;
    }

    public void update(String unityLinkSeCode, String unityLinkNm, String unityLinkUrl, String unityLinkDc) {
        this.unityLinkSeCode = unityLinkSeCode;
        this.unityLinkNm = unityLinkNm;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDc = unityLinkDc;
    }
}

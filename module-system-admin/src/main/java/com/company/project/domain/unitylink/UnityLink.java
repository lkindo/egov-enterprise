package com.company.project.domain.unitylink;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "NUNITYLINK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class UnityLink extends BaseEntity {

    @Id
    @Column(name = "UNITY_LINK_ID", length = 20)
    private String unityLinkId;

    @Column(name = "UNITY_LINK_SE_CODE", length = 3, nullable = false)
    private String unityLinkCategoryCode;

    @Column(name = "UNITY_LINK_NM", length = 255, nullable = false)
    private String unityLinkName;

    @Column(name = "UNITY_LINK_URL", length = 255, nullable = false)
    private String unityLinkUrl;

    @Column(name = "UNITY_LINK_DC", length = 1000)
    private String unityLinkDescription;

    public void update(String unityLinkCategoryCode, String unityLinkName, String unityLinkUrl,
            String unityLinkDescription) {
        this.unityLinkCategoryCode = unityLinkCategoryCode;
        this.unityLinkName = unityLinkName;
        this.unityLinkUrl = unityLinkUrl;
        this.unityLinkDescription = unityLinkDescription;
    }
}

package com.company.project.domain.template;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 템플릿 정보 엔티티
 */
@Entity
@Table(name = "COMTNTMPLATINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TmplatInfo extends BaseEntity {

    @Id
    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "TMPLAT_NM", nullable = false, length = 255)
    private String tmplatNm;

    @Column(name = "TMPLAT_SE_CODE", nullable = false, length = 6)
    private String tmplatSeCode;

    @Column(name = "TMPLAT_COURS", length = 2000)
    private String tmplatCours;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public void update(String tmplatNm, String tmplatSeCode, String tmplatCours, String useAt) {
        this.tmplatNm = tmplatNm;
        this.tmplatSeCode = tmplatSeCode;
        this.tmplatCours = tmplatCours;
        this.useAt = useAt;
    }
}

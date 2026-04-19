package nuri.foundation.domain.template;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 템플릿 정보 엔티티
 * 매핑 테이블: NTMPLATINFO
 */
@Entity
@Table(name = "NTMPLATINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Template extends BaseEntity {

    @Id
    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "TMPLAT_NM", length = 255, nullable = false)
    private String tmplatNm;

    @Column(name = "TMPLAT_SE_CODE", length = 20, nullable = false)
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

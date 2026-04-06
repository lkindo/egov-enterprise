package nuri.foundation.domain.template;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 템플릿 정보 JPA Entity
 */
@EntityListeners(AuditingEntityListener.class)
@Entity(name = "CommonTemplate")
@Table(name = "NTMPLATINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Template extends BaseEntity {

    @Id
    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "TMPLAT_NM", length = 100, nullable = false)
    private String tmplatNm;

    @Column(name = "TMPLAT_COURS", length = 255)
    private String tmplatCours;

    @Column(name = "TMPLAT_SE_CODE", length = 20)
    private String tmplatSeCode;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public void update(String tmplatNm, String tmplatCours, String tmplatSeCode, String useAt) {
        this.tmplatNm = tmplatNm;
        this.tmplatCours = tmplatCours;
        this.tmplatSeCode = tmplatSeCode;
        this.useAt = useAt;
    }
}

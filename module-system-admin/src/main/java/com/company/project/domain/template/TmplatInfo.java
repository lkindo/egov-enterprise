package com.company.project.domain.template;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * ??쀫탣???類ｋ궖 ?酉???
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NTMPLATINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
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

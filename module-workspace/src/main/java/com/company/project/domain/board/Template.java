package com.company.project.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity(name = "BoardTemplate")
@Table(name = "NTMPLATINFO")
public class Template extends BaseEntity {

    @Id
    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "TMPLAT_NM", nullable = false, length = 765)
    private String tmplatNm;

    @Column(name = "TMPLAT_COURS", nullable = false, length = 6000)
    private String tmplatCours;

    @Column(name = "USE_AT", nullable = false, length = 1)
    @Builder.Default
    private String useAt = "Y";

    @Column(name = "TMPLAT_SE_CODE", length = 6, nullable = false)
    private String tmplatSeCode;

    public void update(String tmplatNm, String tmplatCours, String useAt, String tmplatSeCode) {
        this.tmplatNm = tmplatNm;
        this.tmplatCours = tmplatCours;
        this.useAt = useAt;
        this.tmplatSeCode = tmplatSeCode;
    }
}

package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 템플릿 엔티티
 * 매핑 테이블: NQUSTNRTMPLAT
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NQUSTNRTMPLAT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrTmplat extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qustnrTmplatId;

    @Column(name = "QUSTNR_TMPLAT_TY", length = 100)
    private String qustnrTmplatTy;

    @Column(name = "QUSTNR_TMPLAT_DC", length = 2000)
    private String qustnrTmplatDc;

    @Column(name = "QUSTNR_TMPLAT_PATH_NM", length = 100)
    private String qustnrTmplatPathNm;

    @Column(name = "QUSTNR_TMPLAT_IMAGE_INFO", length = 2000)
    private String qustnrTmplatImageInfo;

    public void update(String qustnrTmplatTy, String qustnrTmplatDc, String qustnrTmplatPathNm, String qustnrTmplatImageInfo) {
        this.qustnrTmplatTy = qustnrTmplatTy;
        this.qustnrTmplatDc = qustnrTmplatDc;
        this.qustnrTmplatPathNm = qustnrTmplatPathNm;
        this.qustnrTmplatImageInfo = qustnrTmplatImageInfo;
    }
}

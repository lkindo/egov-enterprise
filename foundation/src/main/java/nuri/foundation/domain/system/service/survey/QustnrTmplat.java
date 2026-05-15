package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SRVY_TMPLT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrTmplat extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String srvyTmplatId;

    @Column(name = "SRVY_TMPLT_TYPE", length = 100)
    private String srvyTmplatTypeCd;

    @Column(name = "QUSTNR_TMPLAT_DC", length = 2000)
    private String srvyTmplatCn;

    @Column(name = "QUSTNR_TMPLAT_PATH_NM", length = 100)
    private String srvyTmplatImgPath;

    @Column(name = "SRVY_TMPLT_IMG_INFO")
    private byte[] srvyTmplatImgInfo;

    public void update(String srvyTmplatTypeCd, String srvyTmplatImgPath, String srvyTmplatCn) {
        this.srvyTmplatTypeCd = srvyTmplatTypeCd;
        this.srvyTmplatImgPath = srvyTmplatImgPath;
        this.srvyTmplatCn = srvyTmplatCn;
    }
}

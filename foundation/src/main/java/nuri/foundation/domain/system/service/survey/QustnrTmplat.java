package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_tmplt")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrTmplat extends BaseEntity {

    @Id
    @Column(name = "srvy_tmplt_id", length = 20)
    private String srvyTmplatId;

    @Column(name = "srvy_tmplt_type_cd", length = 100)
    private String srvyTmplatTypeCd;

    @Column(name = "srvy_tmplt_expln", length = 2000)
    private String srvyTmplatCn;

    @Column(name = "srvy_tmplt_path_nm", length = 100)
    private String srvyTmplatImgPath;

    @Column(name = "srvy_tmplt_img_info")
    private byte[] srvyTmplatImgInfo;

    public void update(String srvyTmplatTypeCd, String srvyTmplatImgPath, String srvyTmplatCn) {
        this.srvyTmplatTypeCd = srvyTmplatTypeCd;
        this.srvyTmplatImgPath = srvyTmplatImgPath;
        this.srvyTmplatCn = srvyTmplatCn;
    }
}

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
@Table(name = "tb_tmplt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Template extends BaseEntity {

    @Id
    @Column(name = "tmplt_id", length = 20)
    private String tmplatId;

    @Column(name = "tmplt_nm", length = 255, nullable = false)
    private String tmplatNm;

    @Column(name = "tmplt_se_cd", length = 20, nullable = false)
    private String tmplatSeCode;

    @Column(name = "tmplt_path", length = 2000)
    private String tmplatCours;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    public void update(String tmplatNm, String tmplatSeCode, String tmplatCours, String useYn) {
        this.tmplatNm = tmplatNm;
        this.tmplatSeCode = tmplatSeCode;
        this.tmplatCours = tmplatCours;
        this.useYn = useYn;
    }
}

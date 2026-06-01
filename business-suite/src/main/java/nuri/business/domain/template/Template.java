package nuri.business.domain.template;

import nuri.business.domain.common.BaseEntity;
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
    private String tmpltId;

    @Column(name = "tmplt_nm", length = 100, nullable = false)
    private String tmpltNm;

    @Column(name = "tmplt_se_cd", length = 12, nullable = false)
    private String tmpltSeCd;

    @Column(name = "tmplt_path", length = 1000)
    private String tmpltPath;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)

    public void update(String tmpltNm, String tmpltSeCd, String tmpltPath, String useYn) {
        this.tmpltNm = tmpltNm;
        this.tmpltSeCd = tmpltSeCd;
        this.tmpltPath = tmpltPath;
        this.useYn = useYn;
    }
}

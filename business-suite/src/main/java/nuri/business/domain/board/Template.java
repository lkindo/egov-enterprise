package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
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
@Table(name = "tb_tmplt_info")
public class Template extends BaseEntity {

    @Id
    @Column(name = "tmplt_id", length = 20)
    private String tmpltId;

    @Column(name = "tmplt_nm", nullable = false, length = 100)
    private String tmpltNm;

    @Column(name = "tmplt_path", nullable = false, length = 1000)
    private String tmpltPath;

    @Column(name = "use_yn", nullable = false, length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "tmplt_se_cd", length = 12, nullable = false)
    private String tmpltSeCd;

    public void update(String tmpltNm, String tmpltPath, String useYn, String tmpltSeCd) {
        this.tmpltNm = tmpltNm;
        this.tmpltPath = tmpltPath;
        this.useYn = useYn;
        this.tmpltSeCd = tmpltSeCd;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}

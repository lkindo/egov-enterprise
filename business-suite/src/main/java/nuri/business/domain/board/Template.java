package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
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
    private String tmplatId;

    @Column(name = "tmplt_nm", nullable = false, length = 100)
    private String tmplatNm;

    @Column(name = "tmplt_path", nullable = false, length = 1000)
    private String tmplatCours;

    @Column(name = "use_yn", nullable = false, length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "tmplt_se_cd", length = 12, nullable = false)
    private String tmplatSeCode;

    public void update(String tmplatNm, String tmplatCours, String useYn, String tmplatSeCode) {
        this.tmplatNm = tmplatNm;
        this.tmplatCours = tmplatCours;
        this.useYn = useYn;
        this.tmplatSeCode = tmplatSeCode;
    }
}

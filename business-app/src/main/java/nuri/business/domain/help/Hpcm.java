package nuri.business.domain.help;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 도움말 정보 Entity
 * 테이블명: TB_HLP_INFO
 */
@Entity
@Table(name = "tb_hlp_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Hpcm extends BaseEntity {

    @Id
    @Column(length = 20)
    private String hlpId;

    @Column(length = 3, nullable = false)
    private String hlpSeCd;

    @Column(length = 1000, nullable = false)
    private String hlpDfn;

    @Column(length = 4000)
    private String hlpExpln;

    private Hpcm(String hlpId, String hlpSeCd, String hlpDfn, String hlpExpln) {
        this.hlpId = hlpId;
        this.hlpSeCd = hlpSeCd;
        this.hlpDfn = hlpDfn;
        this.hlpExpln = hlpExpln;
    }

    @Builder
    public static Hpcm create(String hlpId, String hlpSeCd, String hlpDfn, String hlpExpln) {
        return new Hpcm(hlpId, hlpSeCd, hlpDfn, hlpExpln);
    }

    public void update(String hlpSeCd, String hlpDfn, String hlpExpln) {
        this.hlpSeCd = hlpSeCd;
        this.hlpDfn = hlpDfn;
        this.hlpExpln = hlpExpln;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}

package nuri.business.domain.code;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공통분류코드 엔티티 (CCMMNCLCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_com_clsf_cd")
public class CommonCodeCategory extends BaseEntity {

    @Id
    @Column(length = 12)
    private String clsfCd;

    @Column(length = 100)
    private String clsfCdNm;

    @Column(length = 4000)
    private String clsfCdExpln;

    @Column(length = 1)
    private String useYn;

    // 기존 커스텀 생성자 (new 사용처 없음 → private 로 보존). 감사 필드는 명시적으로 채운다.
    private CommonCodeCategory(String clsfCd, String clsfCdNm, String clsfCdExpln, String useYn, String frstRegisterId) {
        this.clsfCd = clsfCd;
        this.clsfCdNm = clsfCdNm;
        this.clsfCdExpln = clsfCdExpln;
        this.useYn = useYn == null ? "Y" : useYn;
        this.frstRgtrId = frstRegisterId;
        this.lastMdfrId = frstRegisterId;
    }

    // 정적 팩토리 create() 위임용 private 생성자. 감사 필드는 JPA Auditing 이 채운다.
    private CommonCodeCategory(String clsfCd, String clsfCdNm, String clsfCdExpln, String useYn) {
        this.clsfCd = clsfCd;
        this.clsfCdNm = clsfCdNm;
        this.clsfCdExpln = clsfCdExpln;
        this.useYn = useYn;
    }

    @Builder
    public static CommonCodeCategory create(String clsfCd, String clsfCdNm, String clsfCdExpln, String useYn) {
        return new CommonCodeCategory(clsfCd, clsfCdNm, clsfCdExpln, useYn);
    }

    public void update(String clsfCdNm, String clsfCdExpln, String useYn, String lastUpdusrId) {
        this.clsfCdNm = clsfCdNm;
        this.clsfCdExpln = clsfCdExpln;
        this.useYn = useYn;
        this.lastMdfrId = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}

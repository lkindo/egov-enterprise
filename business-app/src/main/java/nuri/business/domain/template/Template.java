package nuri.business.domain.template;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 템플릿 정보 엔티티
 * 매핑 테이블: NTMPLATINFO
 */
@Entity
@Table(name = "tb_tmplt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Template extends BaseEntity {

    @Id
    @Column(length = 20)
    private String tmpltId;

    @Column(length = 100, nullable = false)
    private String tmpltNm;

    @Column(length = 12, nullable = false)
    private String tmpltSeCd;

    @Column(length = 1000)
    private String tmpltPath;

    @Column(length = 1)
    private String useYn;

    private Template(String tmpltId, String tmpltNm, String tmpltSeCd, String tmpltPath, String useYn) {
        this.tmpltId = tmpltId;
        this.tmpltNm = tmpltNm;
        this.tmpltSeCd = tmpltSeCd;
        this.tmpltPath = tmpltPath;
        this.useYn = useYn;
    }

    /**
     * [Phase 5.2 규범] 빌더 배치용 정적 팩토리.
     * 기존 {@code Template.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static Template create(String tmpltId, String tmpltNm, String tmpltSeCd, String tmpltPath, String useYn) {
        return new Template(tmpltId, tmpltNm, tmpltSeCd, tmpltPath, useYn);
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)

    public void update(String tmpltNm, String tmpltSeCd, String tmpltPath, String useYn) {
        this.tmpltNm = tmpltNm;
        this.tmpltSeCd = tmpltSeCd;
        this.tmpltPath = tmpltPath;
        this.useYn = useYn;
    }
}

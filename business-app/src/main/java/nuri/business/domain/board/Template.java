package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 게시판 템플릿 엔티티 (TB_TMPLT_INFO, {@code @Entity name="BoardTemplate"})
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder}/{@code @AllArgsConstructor} 를 제거하고,
 * 빌더는 정적 팩토리 {@link #create}에 {@code @Builder} 로 배치한다. {@code useYn} 기본값("Y")은 팩토리에서 재현하며,
 * {@code @EntityListeners} 는 {@code BaseTimeEntity} 에서 전파된다.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity(name = "BoardTemplate")
@Table(name = "tb_tmplt_info")
public class Template extends BaseEntity {

    @Id
    @Column(length = 20)
    private String tmpltId;

    @Column(nullable = false, length = 100)
    private String tmpltNm;

    @Column(nullable = false, length = 1000)
    private String tmpltPath;

    @Column(nullable = false, length = 1)
    private String useYn = "Y";

    @Column(length = 12, nullable = false)
    private String tmpltSeCd;

    private Template(String tmpltId, String tmpltNm, String tmpltPath, String useYn, String tmpltSeCd) {
        this.tmpltId = tmpltId;
        this.tmpltNm = tmpltNm;
        this.tmpltPath = tmpltPath;
        this.useYn = useYn != null ? useYn : "Y"; // 기존 @Builder.Default("Y") 재현
        this.tmpltSeCd = tmpltSeCd;
    }

    @Builder
    public static Template create(String tmpltId, String tmpltNm, String tmpltPath, String useYn, String tmpltSeCd) {
        return new Template(tmpltId, tmpltNm, tmpltPath, useYn, tmpltSeCd);
    }

    public void update(String tmpltNm, String tmpltPath, String useYn, String tmpltSeCd) {
        this.tmpltNm = tmpltNm;
        this.tmpltPath = tmpltPath;
        this.useYn = useYn;
        this.tmpltSeCd = tmpltSeCd;
    }
}

package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 만족도 엔티티 (TB_DGSTFN_INFO)
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder}/{@code @AllArgsConstructor} 를 제거하고,
 * 빌더는 정적 팩토리 {@link #create}에 {@code @Builder} 로 배치한다. {@code useYn} 기본값("Y")은 팩토리에서 재현하며,
 * 감사 필드는 표준 Auditing 파이프라인에 위임한다. {@code @EntityListeners} 는 {@code BaseTimeEntity} 에서 전파.
 * (참고: 클래스 레벨 {@code @Setter} 제거는 후속 단계에서 도메인 메서드 캡슐화와 함께 진행)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_dgstfn_info")
public class Satisfaction extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "stsfdgIdSeq")
    @SequenceGenerator(name = "stsfdgIdSeq", sequenceName = "sq_dgstfn_sn", allocationSize = 1)
    private Long dgstfnSn;

    @Column(nullable = false, length = 20)
    private String bbsId;

    @Column(nullable = false, length = 20)
    private String pstId;

    @Column(nullable = false)
    private Integer dgstfnScr;

    @Column(length = 4000)
    private String dgstfnCn;

    @Column(length = 256)
    private String pswd;

    @Column(length = 1)
    private String useYn;

    @Column(length = 20)
    private String userId;

    @Column(length = 100)
    private String userNm;

    private Satisfaction(Long dgstfnSn, String bbsId, String pstId, Integer dgstfnScr, String dgstfnCn,
            String pswd, String useYn, String userId, String userNm) {
        this.dgstfnSn = dgstfnSn;
        this.bbsId = bbsId;
        this.pstId = pstId;
        this.dgstfnScr = dgstfnScr;
        this.dgstfnCn = dgstfnCn;
        this.pswd = pswd;
        this.useYn = useYn != null ? useYn : "Y"; // 기존 @Builder.Default("Y") 재현
        this.userId = userId;
        this.userNm = userNm;
    }

    /**
     * 만족도 생성 정적 팩토리(빌더 진입점). {@code Satisfaction.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static Satisfaction create(Long dgstfnSn, String bbsId, String pstId, Integer dgstfnScr,
            String dgstfnCn, String pswd, String useYn, String userId, String userNm) {
        return new Satisfaction(dgstfnSn, bbsId, pstId, dgstfnScr, dgstfnCn, pswd, useYn, userId, userNm);
    }

    public void update(Integer dgstfnScr, String dgstfnCn, String password) {
        this.dgstfnScr = dgstfnScr;
        this.dgstfnCn = dgstfnCn;
        if (password != null && !password.isEmpty()) {
            this.pswd = password;
        }
    }

    public void delete() {
        this.useYn = "N";
    }
}

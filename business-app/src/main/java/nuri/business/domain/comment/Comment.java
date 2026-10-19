package nuri.business.domain.comment;

import java.io.Serializable;
import nuri.foundation.domain.common.BaseEntity;
import nuri.business.domain.board.Board;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

/**
 * 게시물 댓글 엔티티 (v5 standardized)
 * - DB Schema Sync: TB_BBS_COMMENT (ans_sn, pst_sn, bbs_id, wrter_id, wrter_nm, ans_cn, use_yn)
 *
 * <p>[2026-10-19] 물리 컬럼 {@code pswd} 는 매핑하지 않는다. 익명 댓글 비밀번호는 쓰는 경로가 없는 폐기 필드인데도
 * 요청 본문의 값을 평문 그대로 저장하고 있었다(만족도는 ADR-0011 로 같은 경로를 걷었다). 새 행은 이 컬럼을 쓰지 않는다.
 * 컬럼 삭제와 기존 값 파기는 별도 DB 결정·승인 대상이라 그대로 둔다.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_bbs_comment")
@Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")
public class Comment extends BaseEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "answerNoSeq")
    @SequenceGenerator(name = "answerNoSeq", sequenceName = "sq_answer_no", allocationSize = 1)
        private Long ansSn;

    @Column(name = "pst_sn")
    private Long pstSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pst_sn", referencedColumnName = "pst_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Board board;

    @Column(length = 20)
    private String bbsId;

    @Column(length = 20)
    private String wrterId;

    @Column(length = 100)
    private String wrterNm;

    @Column(length = 4000)
    private String ansCn;

    @Column(length = 1)
    private String useYn = "Y";

    /**
     * 팩토리 전용 생성자 (private).
     * 팩토리 파라미터(= 빌더로 설정되는 own 필드의 합집합)를 위임받는다.
     * 감사 필드(frstRgtrId/lastMdfrId/crtDt/mdfcnDt)와
     * 읽기전용 연관(board: insertable=false, updatable=false)은 제외한다.
     * @Builder.Default 재현: useYn 널병합 처리(널이면 기본값 "Y").
     */
    private Comment(Long ansSn, Long pstSn, String bbsId, String wrterId, String wrterNm,
                    String ansCn, String useYn) {
        this.ansSn = ansSn;
        this.pstSn = pstSn;
        this.bbsId = bbsId;
        this.wrterId = wrterId;
        this.wrterNm = wrterNm;
        this.ansCn = ansCn;
        this.useYn = useYn != null ? useYn : "Y";
    }

    /**
     * 표준 정적 팩토리 (Phase 5.2 빌더 규범).
     * 기존 Comment.builder()...build() 호출부와 완전 호환된다.
     */
    @Builder
    public static Comment create(Long ansSn, Long pstSn, String bbsId, String wrterId, String wrterNm,
                                 String ansCn, String useYn) {
        return new Comment(ansSn, pstSn, bbsId, wrterId, wrterNm, ansCn, useYn);
    }

    public void update(String ansCn) {
        this.ansCn = ansCn;
    }

    public void delete() {
        this.useYn = "N";
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}

package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 게시판 마스터 옵션 엔티티 (TB_BBS_MASTER_OPTN)
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder}/{@code @AllArgsConstructor} 를 제거하고,
 * 빌더는 정적 팩토리 {@link #create}에 {@code @Builder} 로 배치한다. ansYn/stsfdgYn 기본값("N")은 팩토리에서 재현.
 * (참고: 클래스 레벨 {@code @Setter} 제거 및 {@code @PrePersist} 의 감사자 하드코딩("webmaster") 정리는 후속 단계)
 */
@Entity
@Table(name = "tb_bbs_master_optn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BoardMasterOption extends BaseEntity {

    @Id
    @Column(length = 20)
    private String bbsId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "bbs_id")
    private BoardMaster boardMaster;

    @Column(length = 1, nullable = false)
    private String ansYn = "N";

    @Column(length = 1, nullable = false)
    private String stsfdgYn = "N";

    private BoardMasterOption(BoardMaster boardMaster, String bbsId, String ansYn, String stsfdgYn) {
        this.boardMaster = boardMaster;
        this.bbsId = bbsId;
        this.ansYn = ansYn != null ? ansYn : "N"; // 기존 @Builder.Default("N") 재현
        this.stsfdgYn = stsfdgYn != null ? stsfdgYn : "N";
    }

    @Builder
    public static BoardMasterOption create(BoardMaster boardMaster, String bbsId, String ansYn, String stsfdgYn) {
        return new BoardMasterOption(boardMaster, bbsId, ansYn, stsfdgYn);
    }

    @PrePersist
    protected void onCreateOption() {
        if (this.ansYn == null) {
            this.ansYn = "N";
        }
        if (this.stsfdgYn == null) {
            this.stsfdgYn = "N";
        }
        if (this.getFrstRgtrId() == null) {
            this.setFrstRgtrId("webmaster");
        }
        if (this.getLastMdfrId() == null) {
            this.setLastMdfrId("webmaster");
        }
    }

    public void changeAnsYn(String ansYn) {
        this.ansYn = ansYn;
    }

    public void changeStsfdgYn(String stsfdgYn) {
        this.stsfdgYn = stsfdgYn;
    }
}

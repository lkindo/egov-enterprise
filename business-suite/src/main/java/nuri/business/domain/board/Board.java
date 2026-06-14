package nuri.business.domain.board;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.io.Serializable;

/**
 * 게시물 엔티티 (v5 standardized)
 * - DB Schema Sync: TB_BBS_ITEM (pst_id as VARCHAR)
 */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_bbs_item")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SQLRestriction("use_yn = 'Y'")
@SuperBuilder
public class Board extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "pst_id", length = 20)
    private String pstId;

    @Column(name = "bbs_id", nullable = false, length = 20)
    private String bbsId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bbs_id", referencedColumnName = "bbs_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private BoardMaster boardMaster;

    private Long ansSn;

    @Column(length = 100)
    private String pstTtl;

    @Column(length = 4000)
    private String pstCn;

    @Column(length = 20)
    private String upPstId;

    private Long sortOrdr;

    @Column(length = 1)
    private String ttlBoldYn;

    @Builder.Default
    private Integer ansLv = 0;

    @Builder.Default
    private Integer inqCnt = 0;

    @Column(length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(length = 20)
    private String pstBgngYmd;

    @Column(length = 20)
    private String pstEndYmd;

    @Column(length = 20)
    private String userId;

    @Column(length = 100)
    private String userNm;

    @Column(length = 200)
    private String pswd;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @Column(length = 1)
    private String scrtYn;

    @Column(length = 20)
    private String blogId;

    private java.time.LocalDateTime evntDt;

    @Column(length = 12)
    @Builder.Default
    private String qnaSttsCd = "OPEN";

    @Column(length = 12)
    private String qnaCatCd;

    @Builder.Default
    private Integer likeCnt = 0;
    
    @Column(length = 1)
    @Builder.Default
    private String ansYn = "N";

    @Column(length = 1)
    @Builder.Default
    private String ntcYn = "N";

    @Builder.Default
    private Integer cmntCnt = 0;
    
    @Builder.Default
    private Integer fileCnt = 0;

    @Builder.Default
    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<nuri.business.domain.comment.Comment> comments = new java.util.ArrayList<>();

    @Version
    private Integer version;

    public void update(String pstTtl, String pstCn, String userId, String userNm, String pswd, String pstBgngYmd,
            String pstEndYmd, String atchFileId, java.time.LocalDateTime evntDt, String qnaSttsCd, String qnaCatCd, String scrtYn) {
        this.pstTtl = pstTtl;
        this.pstCn = pstCn;
        this.userId = userId;
        this.userNm = userNm;
        this.pswd = pswd;
        this.pstBgngYmd = pstBgngYmd;
        this.pstEndYmd = pstEndYmd;
        this.atchFileId = atchFileId;
        this.evntDt = evntDt;
        this.qnaSttsCd = qnaSttsCd;
        this.qnaCatCd = qnaCatCd;
        this.scrtYn = scrtYn;
    }

    public void delete() {
        this.useYn = "N";
    }

    public void increaseInqCnt() {
        if (this.inqCnt == null) {
            this.inqCnt = 0;
        }
        this.inqCnt++;
    }

    public void updateReplyOrder(Long ansSn) {
        this.ansSn = ansSn;
    }

    public void increaseLikeCnt() {
        if (this.likeCnt == null) {
            this.likeCnt = 0;
        }
        this.likeCnt++;
    }

}

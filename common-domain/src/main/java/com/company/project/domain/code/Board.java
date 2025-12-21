package com.company.project.domain.code;

import com.company.project.domain.common.BaseTimeEntity;
import com.company.project.domain.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@IdClass(BoardId.class)
@Table(name = "NBBS")
public class Board {

    @Id
    @Column(name = "NTT_ID")
    private Long id;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BBS_ID", nullable = false)
    private BoardMaster boardMaster;

    @Column(name = "NTT_SJ", nullable = false, length = 6000)
    private String nttSj; // 게시물 제목

    @Column(name = "NTT_CN", nullable = false)
    private String nttCn; // 게시물 내용 (Cubrid STRING/CLOB 대응)

    @Column(name = "NTCE_BGNDE", length = 20)
    private String ntceBgnde; // 게시 시작일

    @Column(name = "NTCE_ENDDE", length = 20)
    private String ntceEndde; // 게시 종료일

    @Column(name = "RDCNT")
    private Integer inqireCo; // 조회수

    @Column(name = "USE_AT", nullable = false, length = 1)
    private String useAt; // 사용 여부 (Y/N)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FRST_REGISTER_ID")
    private User author; // 작성자 (회원 연동)

    @Column(name = "NTCR_NM", length = 60)
    private String ntcrNm; // 게시자명 (비회원 가능 대비)

    @Column(name = "PASSWORD", length = 600)
    private String password; // 비밀번호 (비회원 게시물용)

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId; // 첨부파일 아이디 (추후 파일 모듈 연동)

    @Column(name = "FRST_REGIST_PNTTM", nullable = false)
    private java.time.LocalDateTime createdDate;

    @Builder
    public Board(Long id, BoardMaster boardMaster, String nttSj, String nttCn, String ntceBgnde, String ntceEndde,
            User author,
            String ntcrNm, String password, String atchFileId) {
        this.id = id;
        this.boardMaster = boardMaster;
        this.nttSj = nttSj;
        this.nttCn = nttCn;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.inqireCo = 0;
        this.useAt = "Y";
        this.author = author;
        this.ntcrNm = ntcrNm;
        this.password = password;
        this.atchFileId = atchFileId;
        this.createdDate = java.time.LocalDateTime.now();
    }

    public void update(String nttSj, String nttCn, String ntceBgnde, String ntceEndde, String atchFileId) {
        this.nttSj = nttSj;
        this.nttCn = nttCn;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.atchFileId = atchFileId;
    }

    public void increaseInqireCo() {
        this.inqireCo++;
    }
}

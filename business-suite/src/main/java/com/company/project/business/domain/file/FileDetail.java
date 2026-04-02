package com.company.project.business.domain.file;
import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ???뵬 怨멸쉭 酉(NFILEDETAIL ???뵠筌띲끋釉
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@IdClass(FileDetailId.class)
@Table(name = "NFILEDETAIL")
@SuperBuilder
public class FileDetail extends BaseEntity {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ATCH_FILE_ID", nullable = false)
    @Setter
    private FileMaster fileMaster;

    @Id
    @Column(name = "FILE_SN")
    private Integer fileSn;

    @Column(name = "FILE_STRE_COURS", length = 6000)
    private String fileStreCours; // 野껋럥以

    @Column(name = "STRE_FILE_NM", length = 765)
    private String streFileNm; // ???????뵬筌

    @Column(name = "ORIGNL_FILE_NM", length = 765)
    private String orignlFileNm; // 癒궚 ???뵬筌

    @Column(name = "FILE_EXTSN", length = 60)
    private String fileExtsn; // 類ㅼ삢??

    @Column(name = "FILE_SIZE")
    private Long fileMg; // ???뵬 由

    @Column(name = "FILE_CN")
    private String fileCn; // ???뵬 ??살구

    public FileDetail(FileMaster fileMaster, Integer fileSn, String fileStreCours, String streFileNm,
            String orignlFileNm, String fileExtsn, Long fileMg, String fileCn) {
        this.fileMaster = fileMaster;
        this.fileSn = fileSn;
        this.fileStreCours = fileStreCours;
        this.streFileNm = streFileNm;
        this.orignlFileNm = orignlFileNm;
        this.fileExtsn = fileExtsn;
        this.fileMg = fileMg;
        this.fileCn = fileCn;
    }
}

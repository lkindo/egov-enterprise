package nuri.business.domain.file;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 파일 상세 엔티티 (NFILEDETAIL 테이블)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@IdClass(FileDetailId.class)
@Table(name = "tb_file_detail")
@SuperBuilder
public class FileDetail extends BaseEntity {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ATCH_FILE_ID", nullable = false)
    @Setter
    private FileMaster fileMaster;

    @Id
    @Column(name = "atch_file_seq")
    private Integer atchFileSeq;

    @Column(length = 1000)
    private String fileStrgPath; // 파일저장경로

    @Column(length = 100)
    private String strgFileNm; // 저장파일명

    @Column(length = 100)
    private String orgnlFileNm; // 원본파일명

    @Column(length = 20)
    private String fileEstn; // 확장자

    @Column
    private Long fileSz; // 파일크기

    @Column(length = 4000)
    private String fileCn; // 파일내용

    public FileDetail(FileMaster fileMaster, Integer fileSn, String fileStreCours, String streFileNm,
            String orignlFileNm, String fileExtsn, Long fileMg, String fileCn) {
        this.fileMaster = fileMaster;
        this.atchFileSeq = fileSn;
        this.fileStrgPath = fileStreCours;
        this.strgFileNm = streFileNm;
        this.orgnlFileNm = orignlFileNm;
        this.fileEstn = fileExtsn;
        this.fileSz = fileMg;
        this.fileCn = fileCn;
    }
}

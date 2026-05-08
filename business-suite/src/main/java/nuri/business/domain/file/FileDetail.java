package nuri.business.domain.file;
import nuri.foundation.domain.common.BaseEntity;
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
    private String fileStreCours; // 파일저장경로

    @Column(name = "STRE_FILE_NM", length = 765)
    private String streFileNm; // 저장파일명

    @Column(name = "ORIGNL_FILE_NM", length = 765)
    private String orignlFileNm; // 원본파일명

    @Column(name = "FILE_EXTSN", length = 60)
    private String fileExtsn; // 확장자

    @Column(name = "FILE_SIZE")
    private Long fileMg; // 파일크기

    @Column(name = "FILE_CN")
    private String fileCn; // 파일내용

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

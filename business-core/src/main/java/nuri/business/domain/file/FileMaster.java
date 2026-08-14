package nuri.business.domain.file;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * 전사 파일 마스터 엔티티 (NFILE 테이블 매핑)
 * [Cleanup] 중복 생성일 필드 제거 및 감사 필드 표준화
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_file_master")
public class FileMaster extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "atch_file_sn", updatable = false, nullable = false)
    private Long atchFileSn;

    @Column(nullable = false, length = 1)
    private String useYn;

    @OneToMany(mappedBy = "fileMaster", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileDetail> fileDetails = new ArrayList<>();

    public FileMaster(Long atchFileSn) {
        this.atchFileSn = atchFileSn;
        this.useYn = "Y";
    }

    /** 신규 첨부 마스터 생성. 식별자는 DB IDENTITY가 부여한다. */
    public static FileMaster create() {
        return new FileMaster(null);
    }

    /**
     * 팩토리(create) 위임용 전체 필드 생성자.
     * @Builder.Default 이던 fileDetails 는 널병합으로 기본값(빈 리스트)을 보장한다.
     */
    private FileMaster(Long atchFileSn, String useYn, List<FileDetail> fileDetails) {
        this.atchFileSn = atchFileSn;
        this.useYn = useYn;
        this.fileDetails = fileDetails != null ? fileDetails : new ArrayList<>();
    }

    @Builder
    public static FileMaster create(Long atchFileSn, String useYn, List<FileDetail> fileDetails) {
        return new FileMaster(atchFileSn, useYn, fileDetails);
    }

    public void addFileDetail(FileDetail detail) {
        this.fileDetails.add(detail);
        detail.setFileMaster(this);
    }

    public void delete() {
        this.useYn = "N";
    }

}

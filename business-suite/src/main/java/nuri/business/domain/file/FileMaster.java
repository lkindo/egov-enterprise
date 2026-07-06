package nuri.business.domain.file;

import nuri.business.domain.common.BaseEntity;
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
    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(nullable = false, length = 1)
    private String useYn;

    @OneToMany(mappedBy = "fileMaster", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileDetail> fileDetails = new ArrayList<>();

    public FileMaster(String atchFileId) {
        this.atchFileId = atchFileId;
        this.useYn = "Y";
    }

    /**
     * 팩토리(create) 위임용 전체 필드 생성자.
     * @Builder.Default 이던 fileDetails 는 널병합으로 기본값(빈 리스트)을 보장한다.
     */
    private FileMaster(String atchFileId, String useYn, List<FileDetail> fileDetails) {
        this.atchFileId = atchFileId;
        this.useYn = useYn;
        this.fileDetails = fileDetails != null ? fileDetails : new ArrayList<>();
    }

    @Builder
    public static FileMaster create(String atchFileId, String useYn, List<FileDetail> fileDetails) {
        return new FileMaster(atchFileId, useYn, fileDetails);
    }

    public void addFileDetail(FileDetail detail) {
        this.fileDetails.add(detail);
        detail.setFileMaster(this);
    }

    public void delete() {
        this.useYn = "N";
    }

}

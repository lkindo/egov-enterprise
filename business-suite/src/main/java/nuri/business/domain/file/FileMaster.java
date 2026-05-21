package nuri.business.domain.file;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;
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
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_file_master")
@SuperBuilder
public class FileMaster extends BaseEntity {

    @Id
    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "use_at", nullable = false, length = 1)
    private String useAt;

    @Builder.Default
    @OneToMany(mappedBy = "fileMaster", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileDetail> fileDetails = new ArrayList<>();

    public FileMaster(String atchFileId) {
        this.atchFileId = atchFileId;
        this.useAt = "Y";
    }

    public void addFileDetail(FileDetail detail) {
        this.fileDetails.add(detail);
        detail.setFileMaster(this);
    }

    public void delete() {
        this.useAt = "N";
    }
}

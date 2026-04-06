package nuri.business.domain.file;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ???뵬 筌띾뜆酉(NFILE ???뵠筌띲끋釉
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NFILE")
@SuperBuilder
public class FileMaster extends BaseEntity {

    @Id
    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "CREAT_DT", nullable = false)
    private LocalDateTime creatDt;

    @Column(name = "USE_AT", nullable = false, length = 1)
    private String useAt;

    @Builder.Default
    @OneToMany(mappedBy = "fileMaster", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileDetail> fileDetails = new ArrayList<>();

    public FileMaster(String atchFileId) {
        this.atchFileId = atchFileId;
        this.creatDt = LocalDateTime.now();
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

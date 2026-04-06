package nuri.business.domain.file;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import nuri.foundation.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "FILE_GROUP")
@SuperBuilder
public class FileGroup extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String atchFileId; // 袁⑹쁽類 ??? ??명(UUID ??

    @Column(length = 1)
    private String useAt;

    @Builder.Default
    @OneToMany(mappedBy = "fileGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileItem> fileItems = new ArrayList<>();

    public FileGroup(String atchFileId) {
        this.atchFileId = atchFileId != null ? atchFileId : UUID.randomUUID().toString();
        this.useAt = "Y";
        this.fileItems = new ArrayList<>();
    }

    public void addFileItem(FileItem item) {
        this.fileItems.add(item);
        if (item.getFileGroup() != this) {
            item.setFileGroup(this);
        }
    }
}

package com.company.project.domain.file;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "FILE_GROUP")
public class FileGroup extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String atchFileId; // ?袁⑹쁽?類? ??? ??명??(UUID ??

    @Column(length = 1)
    private String useAt;

    @OneToMany(mappedBy = "fileGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileItem> fileItems = new ArrayList<>();

    public FileGroup(String atchFileId) {
        this.atchFileId = atchFileId != null ? atchFileId : UUID.randomUUID().toString();
        this.useAt = "Y";
    }

    public void addFileItem(FileItem item) {
        this.fileItems.add(item);
        if (item.getFileGroup() != this) {
            item.setFileGroup(this);
        }
    }
}

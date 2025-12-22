package com.company.project.domain.file;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 파일 마스터 엔티티 (NFILE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NFILE")
public class FileMaster {

    @Id
    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "CREAT_DT", nullable = false)
    private LocalDateTime creatDt;

    @Column(name = "USE_AT", nullable = false, length = 1)
    private String useAt;

    @OneToMany(mappedBy = "fileMaster", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileDetail> fileDetails = new ArrayList<>();

    @Builder
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

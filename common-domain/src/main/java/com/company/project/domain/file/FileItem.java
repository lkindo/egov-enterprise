package com.company.project.domain.file;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "FILE_ITEM")
public class FileItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_group_id", nullable = false)
    private FileGroup fileGroup;

    private Integer fileSn; // 파일 순번

    @Column(nullable = false)
    private String fileStreCours; // 파일 저장 경로

    @Column(nullable = false)
    private String streFileNm; // 저장된 파일명

    @Column(nullable = false)
    private String orignlFileNm; // 원본 파일명

    private String fileExtsn; // 파일 확장자

    private Long fileSize; // 파일 크기

    @Builder
    public FileItem(FileGroup fileGroup, Integer fileSn, String fileStreCours, String streFileNm, String orignlFileNm,
            String fileExtsn, Long fileSize) {
        this.fileGroup = fileGroup;
        this.fileSn = fileSn;
        this.fileStreCours = fileStreCours;
        this.streFileNm = streFileNm;
        this.orignlFileNm = orignlFileNm;
        this.fileExtsn = fileExtsn;
        this.fileSize = fileSize;
    }

    protected void setFileGroup(FileGroup fileGroup) {
        this.fileGroup = fileGroup;
    }
}

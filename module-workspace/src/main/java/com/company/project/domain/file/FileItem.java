package com.company.project.domain.file;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "FILE_ITEM")
@SuperBuilder
public class FileItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_group_id", nullable = false)
    private FileGroup fileGroup;

    private Integer fileSn; // ???뵬 ??뺤쓰

    @Column(nullable = false)
    private String fileStreCours; // ???뵬 ????野껋럥以?

    @Column(nullable = false)
    private String streFileNm; // ???貫留????뵬筌?

    @Column(nullable = false)
    private String orignlFileNm; // ?癒?궚 ???뵬筌?

    private String fileExtsn; // ???뵬 ?類ㅼ삢??

    private Long fileSize; // ???뵬 ??由?

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

package com.company.project.domain.file;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * 파일 상세 복합키 (NFILEDETAIL 복합 PK)
 */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class FileDetailId implements Serializable {
    private String fileMaster; // FileMaster의 atchFileId
    private Integer fileSn;
}

package com.company.project.business.domain.file;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * ???뵬 怨멸쉭 癰귣벏鍮(NFILEDETAIL 癰귣벏鍮 PK)
 */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class FileDetailId implements Serializable {
    private String fileMaster; // FileMaster??atchFileId
    private Integer fileSn;
}

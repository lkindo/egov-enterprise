package nuri.business.domain.file;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * 파일 상세 식별자 (NFILEDETAIL 식별자 PK)
 */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class FileDetailId implements Serializable {
    private String fileMaster; // FileMaster??atchFileId
    private Integer fileSn;
}

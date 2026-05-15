package nuri.business.service.file.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * ??? 정보 DTO
 */
@Getter
@Builder
public class FileDto {
    private String atchFileId;
    private Integer fileSn;
    private String fileStreCours;
    private String streFileNm;
    private String orignlFileNm;
    private String fileExtsn;
    private Long fileMg;
    private String fileCn;
    private String createdDate;
}

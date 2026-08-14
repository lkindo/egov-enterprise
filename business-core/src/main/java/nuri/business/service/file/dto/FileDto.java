package nuri.business.service.file.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * ??? 정보 DTO
 */
@Getter
@Builder
public class FileDto {
    private Long atchFileSn;
    private Integer fileSn;
    private String fileStreCours;
    private String streFileNm;
    private String orignlFileNm;
    private String fileExtsn;
    private Long fileMg;
    @Size(max = 4000)
    private String fileCn;
    private LocalDateTime crtDt;
}

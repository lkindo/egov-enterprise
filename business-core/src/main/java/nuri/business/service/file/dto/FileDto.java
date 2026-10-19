package nuri.business.service.file.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 첨부파일 정보 DTO
 *
 * <p>[2026-10-19] 서버 저장 경로({@code file_strg_path})와 저장 파일명({@code strg_file_nm})은 싣지 않는다.
 * 종전에는 {@code fileStreCours}·{@code streFileNm} 으로 목록 응답에 실려, 첨부를 읽을 수 있는 사람이면 저장소의
 * 디렉터리 구조와 실물 파일 이름을 알 수 있었다. 화면은 두 값을 쓰지 않고, 내려받기는 {@code (atchFileSn, fileSn)}
 * 식별자로만 한다 — 실물 위치는 서버만 안다.
 */
@Getter
@Builder
public class FileDto {
    private Long atchFileSn;
    private Integer fileSn;
    private String orignlFileNm;
    private String fileExtsn;
    private Long fileMg;
    @Size(max = 4000)
    private String fileCn;
    private LocalDateTime crtDt;
}

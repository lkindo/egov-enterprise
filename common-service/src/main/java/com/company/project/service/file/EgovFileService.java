package com.company.project.service.file;

import com.company.project.service.file.dto.FileDto;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * 파일 관리 서비스 인터페이스
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovFileService {

    /**
     * 파일 업로드 (멀티파일 지원)
     */
    String uploadFiles(List<MultipartFile> files) throws IOException;

    /**
     * 첨부파일 목록 조회
     */
    List<FileDto> getFileList(String atchFileId);

    /**
     * 파일 다운로드를 위한 Resource 조회
     */
    Resource getFileResource(String atchFileId, Integer fileSn) throws IOException;

    /**
     * 파일 삭제 (전체)
     */
    void deleteFiles(String atchFileId) throws IOException;

    /**
     * 파일 삭제 (단별)
     */
    void deleteFile(String atchFileId, Integer fileSn) throws IOException;

    /**
     * 파일 상세 조회 (단건)
     */
    FileDto getFileDetail(String atchFileId, Integer fileSn);

    /**
     * 파일 수정 (추가 업로드)
     */
    void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException;
}

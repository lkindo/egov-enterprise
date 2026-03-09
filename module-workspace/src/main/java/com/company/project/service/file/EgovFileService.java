package com.company.project.service.file;

import com.company.project.service.file.dto.FileDto;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

/**
 * 파일 저장 서비스 인터페이스
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 정의
 */
public interface EgovFileService {

    /**
     * 파일 업로드 (멀티파트)
     */
    String uploadFiles(List<MultipartFile> files) throws IOException;

    /**
     * 첨부파일 목록 조회
     */
    List<FileDto> getFileList(String atchFileId);

    /**
     * 파일 다운로드를 위한 리소스 조회
     */
    Resource getFileResource(String atchFileId, Integer fileSn) throws IOException;

    /**
     * 파일 삭제 (전체)
     */
    void deleteFiles(String atchFileId) throws IOException;

    /**
     * 파일 삭제 (단건)
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

    /**
     * 전체 파일 목록 조회 (관리자용)
     */
    org.springframework.data.domain.Page<FileDto> getAllFileList(org.springframework.data.domain.Pageable pageable,
            String searchKeyword);
}

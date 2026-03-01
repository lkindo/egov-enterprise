package com.company.project.service.file;

import com.company.project.service.file.dto.FileDto;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * ???�� ?�????�퉬???명꽣??�씠??
 * - ?꾩옄?�??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 ?�⑹????꾪븳 ?명꽣??�씠???�꾨?? */
public interface EgovFileService {

    /**
     * ???�� ??�줈??(硫?고뙆??吏??
     */
    String uploadFiles(List<MultipartFile> files) throws IOException;

    /**
     * 泥⑤????�� 紐⑸�?議고??     */
    List<FileDto> getFileList(String atchFileId);

    /**
     * ???�� ??�슫濡쒕뱶瑜??꾪븳 Resource 議고??     */
    Resource getFileResource(String atchFileId, Integer fileSn) throws IOException;

    /**
     * ???�� ????(?꾩껜)
     */
    void deleteFiles(String atchFileId) throws IOException;

    /**
     * ???�� ????(??��?
     */
    void deleteFile(String atchFileId, Integer fileSn) throws IOException;

    /**
     * ???�� ?곸꽭 議고??(??�굔)
     */
    FileDto getFileDetail(String atchFileId, Integer fileSn);

    /**
     * ???�� ??�젙 (?�붽? ??�줈??
     */
    void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException;

    /**
     * 紐⑤�????�� 紐⑸�?議고??(Admin ??
     */
    org.springframework.data.domain.Page<FileDto> getAllFileList(org.springframework.data.domain.Pageable pageable,
            String searchKeyword);
}

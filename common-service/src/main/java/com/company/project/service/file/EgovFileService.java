package com.company.project.service.file;

import com.company.project.service.file.dto.FileDto;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * ?뚯씪 愿由??쒕퉬???명꽣?섏씠??
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”???꾪븳 ?명꽣?섏씠??遺꾨━
 */
public interface EgovFileService {

    /**
     * ?뚯씪 ?낅줈??(硫?고뙆??吏??
     */
    String uploadFiles(List<MultipartFile> files) throws IOException;

    /**
     * 泥⑤??뚯씪 紐⑸줉 議고쉶
     */
    List<FileDto> getFileList(String atchFileId);

    /**
     * ?뚯씪 ?ㅼ슫濡쒕뱶瑜??꾪븳 Resource 議고쉶
     */
    Resource getFileResource(String atchFileId, Integer fileSn) throws IOException;

    /**
     * ?뚯씪 ??젣 (?꾩껜)
     */
    void deleteFiles(String atchFileId) throws IOException;

    /**
     * ?뚯씪 ??젣 (?⑤퀎)
     */
    void deleteFile(String atchFileId, Integer fileSn) throws IOException;

    /**
     * ?뚯씪 ?곸꽭 議고쉶 (?④굔)
     */
    FileDto getFileDetail(String atchFileId, Integer fileSn);

    /**
     * ?뚯씪 ?섏젙 (異붽? ?낅줈??
     */
    void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException;

    /**
     * 紐⑤뱺 ?뚯씪 紐⑸줉 議고쉶 (Admin ??
     */
    org.springframework.data.domain.Page<FileDto> getAllFileList(org.springframework.data.domain.Pageable pageable,
            String searchKeyword);
}

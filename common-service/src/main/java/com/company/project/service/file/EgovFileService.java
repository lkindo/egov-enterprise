package com.company.project.service.file;

import com.company.project.service.file.dto.FileDto;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * ???”ª ?¿Â€????•í‰¬???ëª…ê½£??ì” ??
 * - ?ê¾©ì˜„?ëº??ê¾¨ì …?ê¾©ì™??5.0 ?ëª…ì†š???ëª„ì¬† ?ë¶½êµ” ?°â‘¹????ê¾ªë¸³ ?ëª…ê½£??ì” ???ºê¾¨?? */
public interface EgovFileService {

    /**
     * ???”ª ??…ì¤ˆ??(ï§Â€?ê³ ë™†??ï§Â€??
     */
    String uploadFiles(List<MultipartFile> files) throws IOException;

    /**
     * ï§£â‘¤????”ª ï§â‘¸ì¤?è­°ê³ ??     */
    List<FileDto> getFileList(String atchFileId);

    /**
     * ???”ª ??¼ìŠ«æ¿¡ì’•ë±¶ç‘œ??ê¾ªë¸³ Resource è­°ê³ ??     */
    Resource getFileResource(String atchFileId, Integer fileSn) throws IOException;

    /**
     * ???”ª ????(?ê¾©ê»œ)
     */
    void deleteFiles(String atchFileId) throws IOException;

    /**
     * ???”ª ????(??¤í€?
     */
    void deleteFile(String atchFileId, Integer fileSn) throws IOException;

    /**
     * ???”ª ?ê³¸ê½­ è­°ê³ ??(??£êµ”)
     */
    FileDto getFileDetail(String atchFileId, Integer fileSn);

    /**
     * ???”ª ??ì ™ (?°ë¶½? ??…ì¤ˆ??
     */
    void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException;

    /**
     * ï§â‘¤ë±????”ª ï§â‘¸ì¤?è­°ê³ ??(Admin ??
     */
    org.springframework.data.domain.Page<FileDto> getAllFileList(org.springframework.data.domain.Pageable pageable,
            String searchKeyword);
}

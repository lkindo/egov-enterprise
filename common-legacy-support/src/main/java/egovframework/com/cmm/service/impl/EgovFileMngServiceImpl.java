package egovframework.com.cmm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovFileMngServiceImpl.java
 * @Description : ????????? ? JPA ?? ?????
 * @Modification Information
 *
 *               ????????????
 *               ------- ------- -------------------
 *               2009. 3. 25. ???????
 *               2024.10.29. LeeBaekHaeng @Override ??
 *               2026.02.10. Antigravity JPA ?
 *
 * @author ????????? ????
 * @since 2009. 3. 25.
 * @version
 * @see
 *
 **/
@Service("EgovFileMngService")
@Transactional(readOnly = true)
@org.springframework.context.annotation.Lazy
@org.springframework.context.annotation.Primary
public class EgovFileMngServiceImpl extends EgovAbstractServiceImpl implements EgovFileMngService {

    @Resource(name = "fileMasterRepository")
    private FileMasterRepository fileMasterRepository;

    @Resource(name = "fileDetailRepository")
    private FileDetailRepository fileDetailRepository;

    /**
     * ????????????????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#deleteFileInfs(java.util.List)
     **/
    @Override
    @Transactional
    public void deleteFileInfs(List<FileVO> fvoList) throws Exception {
        for (FileVO fvo : fvoList) {
            deleteFileInf(fvo);
        }
    }

    /**
     * ??????????????(?? ??)?????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#insertFileInf(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    @Transactional
    public String insertFileInf(FileVO fvo) throws Exception {
        // ??? ??? ?????
        FileMaster master = fileMasterRepository.findById(fvo.getAtchFileId())
                .orElseGet(() -> {
                    FileMaster newMaster = FileMaster.builder()
                            .atchFileId(fvo.getAtchFileId())
                            .build();
                    return fileMasterRepository.save(newMaster);
                });

        // ??? ? ? ??
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .fileSn(Integer.parseInt(fvo.getFileSn()))
                .fileStreCours(fvo.getFileStreCours())
                .streFileNm(fvo.getStreFileNm())
                .orignlFileNm(fvo.getOrignlFileNm())
                .fileExtsn(fvo.getFileExtsn())
                .fileMg(Long.parseLong(fvo.getFileMg()))
                .fileCn(fvo.getFileCn())
                .build();

        master.addFileDetail(detail);
        fileDetailRepository.save(detail);

        return fvo.getAtchFileId();
    }

    /**
     * ????????????????(?? ??)?????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#insertFileInfs(java.util.List)
     **/
    @Override
    @Transactional
    public String insertFileInfs(List<FileVO> fvoList) throws Exception {
        if (fvoList.isEmpty()) {
            return null;
        }

        FileVO firstVO = fvoList.get(0);
        String atchFileId = firstVO.getAtchFileId();

        // ??? ?????
        FileMaster master = FileMaster.builder()
                .atchFileId(atchFileId)
                .build();
        master = fileMasterRepository.save(master);

        // ??? ? ?????
        for (FileVO fvo : fvoList) {
            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .fileSn(Integer.parseInt(fvo.getFileSn()))
                    .fileStreCours(fvo.getFileStreCours())
                    .streFileNm(fvo.getStreFileNm())
                    .orignlFileNm(fvo.getOrignlFileNm())
                    .fileExtsn(fvo.getFileExtsn())
                    .fileMg(Long.parseLong(fvo.getFileMg()))
                    .fileCn(fvo.getFileCn())
                    .build();

            master.addFileDetail(detail);
            fileDetailRepository.save(detail);
        }

        return atchFileId;
    }

    /**
     * ??????????????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectFileInfs(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    public List<FileVO> selectFileInfs(FileVO fvo) throws Exception {
        FileMaster master = fileMasterRepository.findById(fvo.getAtchFileId())
                .orElse(null);

        if (master != null) {
            return master.getFileDetails().stream()
                    .map(this::toFileVO)
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    /**
     * ????????????????(?? ??)??????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#updateFileInfs(java.util.List)
     **/
    @Override
    @Transactional
    public void updateFileInfs(List<FileVO> fvoList) throws Exception {
        if (fvoList.isEmpty()) {
            return;
        }

        // ????? ? ? ????
        FileVO firstVO = fvoList.get(0);
        FileMaster master = fileMasterRepository.findById(firstVO.getAtchFileId())
                .orElseThrow(() -> new IllegalArgumentException("File master not found: " + firstVO.getAtchFileId()));

        // ????? ? ? ????
        fileDetailRepository.deleteAll(master.getFileDetails());

        // ????? ? ? ??
        for (FileVO fvo : fvoList) {
            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .fileSn(Integer.parseInt(fvo.getFileSn()))
                    .fileStreCours(fvo.getFileStreCours())
                    .streFileNm(fvo.getStreFileNm())
                    .orignlFileNm(fvo.getOrignlFileNm())
                    .fileExtsn(fvo.getFileExtsn())
                    .fileMg(Long.parseLong(fvo.getFileMg()))
                    .fileCn(fvo.getFileCn())
                    .build();

            master.addFileDetail(detail);
            fileDetailRepository.save(detail);
        }
    }

    /**
     * ??????????????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#deleteFileInf(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    @Transactional
    public void deleteFileInf(FileVO fvo) throws Exception {
        FileDetail detail = fileDetailRepository.findById(
                new com.company.project.domain.file.FileDetailId(
                        fvo.getAtchFileId(),
                        Integer.parseInt(fvo.getFileSn())))
                .orElse(null);

        if (detail != null) {
            fileDetailRepository.delete(detail);
        }
    }

    /**
     * ????????????????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectFileInf(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    public FileVO selectFileInf(FileVO fvo) throws Exception {
        FileDetail detail = fileDetailRepository.findById(
                new com.company.project.domain.file.FileDetailId(
                        fvo.getAtchFileId(),
                        Integer.parseInt(fvo.getFileSn())))
                .orElse(null);

        return detail != null ? toFileVO(detail) : null;
    }

    /**
     * ??? ??? ???????????
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#getMaxFileSN(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    public int getMaxFileSN(FileVO fvo) throws Exception {
        List<FileDetail> details = fileDetailRepository.findByFileMaster(
                fileMasterRepository.findById(fvo.getAtchFileId())
                        .orElseThrow(
                                () -> new IllegalArgumentException("File master not found: " + fvo.getAtchFileId())));

        if (details.isEmpty()) {
            return 0;
        }

        return details.stream()
                .mapToInt(detail -> detail.getFileSn())
                .max()
                .orElse(0);
    }

    /**
     * ? ??????????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#deleteAllFileInf(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    @Transactional
    public void deleteAllFileInf(FileVO fvo) throws Exception {
        FileMaster master = fileMasterRepository.findById(fvo.getAtchFileId())
                .orElse(null);

        if (master != null) {
            fileDetailRepository.deleteAll(master.getFileDetails());
            fileMasterRepository.delete(master);
        }
    }

    /**
     * ?????? ?????????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectFileListByFileNm(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    public Map<String, Object> selectFileListByFileNm(FileVO fvo) throws Exception {
        Pageable pageable = PageRequest.of(fvo.getPageIndex() - 1, fvo.getPageSize());

        org.springframework.data.domain.Page<FileDetail> page = fileDetailRepository
                .findByOrignlFileNmContaining(fvo.getOrignlFileNm(), pageable);

        List<FileVO> result = page.getContent().stream()
                .map(this::toFileVO)
                .collect(Collectors.toList());

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", (int) page.getTotalElements());

        return map;
    }

    /**
     * ??? ??????????????.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectImageFileList(egovframework.com.cmm.service.FileVO)
     **/
    @Override
    public List<FileVO> selectImageFileList(FileVO vo) throws Exception {
        FileMaster master = fileMasterRepository.findById(vo.getAtchFileId())
                .orElse(null);

        if (master != null) {
            return master.getFileDetails().stream()
                    .filter(detail -> isImageFile(detail.getFileExtsn()))
                    .map(this::toFileVO)
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    /**
     * ??? VO???
     **/
    private FileVO toFileVO(FileDetail detail) {
        FileVO vo = new FileVO();
        vo.setAtchFileId(detail.getFileMaster().getAtchFileId());
        vo.setFileSn(String.valueOf(detail.getFileSn()));
        vo.setFileStreCours(detail.getFileStreCours());
        vo.setStreFileNm(detail.getStreFileNm());
        vo.setOrignlFileNm(detail.getOrignlFileNm());
        vo.setFileExtsn(detail.getFileExtsn());
        vo.setFileMg(String.valueOf(detail.getFileMg()));
        vo.setFileCn(detail.getFileCn());
        return vo;
    }

    /**
     * ??? ????? ?
     **/
    private boolean isImageFile(String fileExtsn) {
        if (fileExtsn == null)
            return false;
        String ext = fileExtsn.toLowerCase();
        return ext.equals(".jpg") || ext.equals(".jpeg") || ext.equals(".gif") ||
                ext.equals(".png") || ext.equals(".bmp") || ext.equals(".svg");
    }
}

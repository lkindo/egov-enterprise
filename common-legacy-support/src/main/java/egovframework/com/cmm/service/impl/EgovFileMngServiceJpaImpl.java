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
 * ????????? ? JPA ?????? ?????
 * 
 * @author Antigravity
 * @since 2026.02.10
 * @version 1.0
 **/
@Service("EgovFileMngServiceJpa")
@Transactional(readOnly = true)
public class EgovFileMngServiceJpaImpl extends EgovAbstractServiceImpl implements EgovFileMngService {

    @Resource(name = "fileMasterRepository")
    private FileMasterRepository fileMasterRepository;

    @Resource(name = "fileDetailRepository")
    private FileDetailRepository fileDetailRepository;

    /**
     * ??????????????.
     *
     * @param fvo
     * @return
     * @throws Exception
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
     * ??????????????(?? ??)?????.
     *
     * @param fvo
     * @throws Exception
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
     * @param fvoList
     * @throws Exception
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
     * ????????????????(?? ??)??????.
     *
     * @param fvoList
     * @throws Exception
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
     * ????????????????.
     *
     * @param fvoList
     * @throws Exception
     **/
    @Override
    @Transactional
    public void deleteFileInfs(List<FileVO> fvoList) throws Exception {
        for (FileVO fvo : fvoList) {
            deleteFileInf(fvo);
        }
    }

    /**
     * ??????????????.
     *
     * @param fvo
     * @throws Exception
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
     * @param fvo
     * @return
     * @throws Exception
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
     * @param fvo
     * @return
     * @throws Exception
     **/
    @Override
    public int getMaxFileSN(FileVO fvo) throws Exception {
        List<FileDetail> details = fileDetailRepository.findByFileMaster(
                fileMasterRepository.findById(fvo.getAtchFileId())
                    .orElseThrow(() -> new IllegalArgumentException("File master not found: " + fvo.getAtchFileId())));
        
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
     * @param fvo
     * @throws Exception
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
     * @param fvo
     * @return
     * @throws Exception
     **/
    @Override
    public Map<String, Object> selectFileListByFileNm(FileVO fvo) throws Exception {
        Pageable pageable = PageRequest.of(fvo.getPageIndex() - 1, fvo.getPageSize());
        
        org.springframework.data.domain.Page<FileDetail> page = 
                fileDetailRepository.findByOrignlFileNmContaining(fvo.getOrignlFileNm(), pageable);
        
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
     * @param vo
     * @return
     * @throws Exception
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
        if (fileExtsn == null) return false;
        String ext = fileExtsn.toLowerCase();
        return ext.equals(".jpg") || ext.equals(".jpeg") || ext.equals(".gif") || 
               ext.equals(".png") || ext.equals(".bmp") || ext.equals(".svg");
    }
}

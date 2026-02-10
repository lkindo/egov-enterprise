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
 * @Description : 파일정보의 관리를 위한 JPA 기반 구현 클래스
 * @Modification Information
 *
 *               수정일 수정자 수정내용
 *               ------- ------- -------------------
 *               2009. 3. 25. 이삼섭 최초생성
 *               2024.10.29. LeeBaekHaeng @Override 표기
 *               2026.02.10. Antigravity JPA 전환
 *
 * @author 공통 서비스 개발팀 이삼섭
 * @since 2009. 3. 25.
 * @version
 * @see
 *
 */
@Service("EgovFileMngService")
@Transactional(readOnly = true)
@org.springframework.context.annotation.Lazy
public class EgovFileMngServiceImpl extends EgovAbstractServiceImpl implements EgovFileMngService {

    @Resource(name = "fileMasterRepository")
    private FileMasterRepository fileMasterRepository;

    @Resource(name = "fileDetailRepository")
    private FileDetailRepository fileDetailRepository;

    /**
     * 여러 개의 파일을 삭제한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#deleteFileInfs(java.util.List)
     */
    @Override
    @Transactional
    public void deleteFileInfs(List<FileVO> fvoList) throws Exception {
        for (FileVO fvo : fvoList) {
            deleteFileInf(fvo);
        }
    }

    /**
     * 하나의 파일에 대한 정보(속성 및 상세)를 등록한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#insertFileInf(egovframework.com.cmm.service.FileVO)
     */
    @Override
    @Transactional
    public String insertFileInf(FileVO fvo) throws Exception {
        // 파일 마스터가 없으면 생성
        FileMaster master = fileMasterRepository.findById(fvo.getAtchFileId())
                .orElseGet(() -> {
                    FileMaster newMaster = FileMaster.builder()
                            .atchFileId(fvo.getAtchFileId())
                            .build();
                    return fileMasterRepository.save(newMaster);
                });

        // 파일 상세 정보 생성
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
     * 여러 개의 파일에 대한 정보(속성 및 상세)를 등록한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#insertFileInfs(java.util.List)
     */
    @Override
    @Transactional
    public String insertFileInfs(List<FileVO> fvoList) throws Exception {
        if (fvoList.isEmpty()) {
            return null;
        }

        FileVO firstVO = fvoList.get(0);
        String atchFileId = firstVO.getAtchFileId();

        // 파일 마스터 생성
        FileMaster master = FileMaster.builder()
                .atchFileId(atchFileId)
                .build();
        master = fileMasterRepository.save(master);

        // 파일 상세 정보들 생성
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
     * 파일에 대한 목록을 조회한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectFileInfs(egovframework.com.cmm.service.FileVO)
     */
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
     * 여러 개의 파일에 대한 정보(속성 및 상세)를 수정한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#updateFileInfs(java.util.List)
     */
    @Override
    @Transactional
    public void updateFileInfs(List<FileVO> fvoList) throws Exception {
        if (fvoList.isEmpty()) {
            return;
        }

        // 기존 파일 상세 정보 삭제
        FileVO firstVO = fvoList.get(0);
        FileMaster master = fileMasterRepository.findById(firstVO.getAtchFileId())
                .orElseThrow(() -> new IllegalArgumentException("File master not found: " + firstVO.getAtchFileId()));

        // 기존 파일 상세 정보 삭제
        fileDetailRepository.deleteAll(master.getFileDetails());

        // 새 파일 상세 정보 추가
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
     * 하나의 파일을 삭제한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#deleteFileInf(egovframework.com.cmm.service.FileVO)
     */
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
     * 파일에 대한 상세정보를 조회한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectFileInf(egovframework.com.cmm.service.FileVO)
     */
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
     * 파일 구분자에 대한 최대값을 구한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#getMaxFileSN(egovframework.com.cmm.service.FileVO)
     */
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
     * 전체 파일을 삭제한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#deleteAllFileInf(egovframework.com.cmm.service.FileVO)
     */
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
     * 파일명 검색에 대한 목록을 조회한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectFileListByFileNm(egovframework.com.cmm.service.FileVO)
     */
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
     * 이미지 파일에 대한 목록을 조회한다.
     *
     * @see egovframework.com.cmm.service.EgovFileMngService#selectImageFileList(egovframework.com.cmm.service.FileVO)
     */
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
     * 파일 VO로 변환
     */
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
     * 이미지 파일인지 확인
     */
    private boolean isImageFile(String fileExtsn) {
        if (fileExtsn == null) return false;
        String ext = fileExtsn.toLowerCase();
        return ext.equals(".jpg") || ext.equals(".jpeg") || ext.equals(".gif") || 
               ext.equals(".png") || ext.equals(".bmp") || ext.equals(".svg");
    }
}

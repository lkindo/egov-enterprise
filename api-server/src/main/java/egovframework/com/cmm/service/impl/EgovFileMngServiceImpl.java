package egovframework.com.cmm.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailId;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import lombok.RequiredArgsConstructor;

/**
 * @Class Name : EgovFileMngServiceImpl.java
 * @Description : 파일정보의 관리를 위한 구현 클래스 (JPA 기반)
 */
@Service("EgovFileMngService")
@RequiredArgsConstructor
public class EgovFileMngServiceImpl extends EgovAbstractServiceImpl implements EgovFileMngService {

    private final FileMasterRepository fileMasterRepository;
    private final FileDetailRepository fileDetailRepository;

    @Override
    @Transactional
    public void deleteFileInfs(List<?> fvoList) throws Exception {
        for (Object obj : fvoList) {
            if (obj instanceof FileVO) {
                deleteFileInf((FileVO) obj);
            }
        }
    }

    @Override
    @Transactional
    public String insertFileInf(FileVO fvo) throws Exception {
        String atchFileId = fvo.getAtchFileId();

        // FileMaster 조회 또는 생성
        FileMaster fileMaster = fileMasterRepository.findById(atchFileId)
                .orElseGet(() -> {
                    FileMaster newMaster = FileMaster.builder()
                            .atchFileId(atchFileId)
                            .build();
                    return fileMasterRepository.save(newMaster);
                });

        // FileDetail 생성
        FileDetail fileDetail = FileDetail.builder()
                .fileSn(fvo.getFileSn() != null ? Integer.parseInt(fvo.getFileSn()) : 0)
                .fileStreCours(fvo.getFileStreCours())
                .streFileNm(fvo.getStreFileNm())
                .orignlFileNm(fvo.getOrignlFileNm())
                .fileExtsn(fvo.getFileExtsn())
                .fileMg(fvo.getFileMg() != null ? Long.parseLong(fvo.getFileMg()) : 0L)
                .fileCn(fvo.getFileCn())
                .build();

        fileMaster.addFileDetail(fileDetail);
        fileMasterRepository.save(fileMaster);

        return atchFileId;
    }

    @Override
    @Transactional
    public String insertFileInfs(List<?> fvoList) throws Exception {
        String atchFileId = "";
        if (fvoList != null && !fvoList.isEmpty()) {
            for (Object obj : fvoList) {
                if (obj instanceof FileVO) {
                    atchFileId = insertFileInf((FileVO) obj);
                }
            }
        }
        return atchFileId.isEmpty() ? null : atchFileId;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FileVO> selectFileInfs(FileVO fvo) throws Exception {
        List<FileVO> result = new ArrayList<>();

        if (fvo.getAtchFileId() != null) {
            fileMasterRepository.findById(fvo.getAtchFileId()).ifPresent(master -> {
                for (FileDetail detail : master.getFileDetails()) {
                    result.add(convertToVO(master, detail));
                }
            });
        }

        return result;
    }

    @Override
    @Transactional
    public void updateFileInfs(List<?> fvoList) throws Exception {
        // Delete old and insert new
        for (Object obj : fvoList) {
            if (obj instanceof FileVO) {
                FileVO fvo = (FileVO) obj;
                deleteFileInf(fvo);
                insertFileInf(fvo);
            }
        }
    }

    @Override
    @Transactional
    public void deleteFileInf(FileVO fvo) throws Exception {
        if (fvo.getAtchFileId() != null && fvo.getFileSn() != null) {
            FileDetailId id = new FileDetailId(fvo.getAtchFileId(), Integer.parseInt(fvo.getFileSn()));
            fileDetailRepository.deleteById(id);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public FileVO selectFileInf(FileVO fvo) throws Exception {
        if (fvo.getAtchFileId() != null && fvo.getFileSn() != null) {
            FileDetailId id = new FileDetailId(fvo.getAtchFileId(), Integer.parseInt(fvo.getFileSn()));
            return fileDetailRepository.findById(id)
                    .map(detail -> convertToVO(detail.getFileMaster(), detail))
                    .orElse(null);
        }
        return null;
    }

    @Override
    @Transactional(readOnly = true)
    public int getMaxFileSN(FileVO fvo) throws Exception {
        if (fvo.getAtchFileId() != null) {
            return fileMasterRepository.findById(fvo.getAtchFileId())
                    .map(master -> master.getFileDetails().stream()
                            .mapToInt(FileDetail::getFileSn)
                            .max()
                            .orElse(0))
                    .orElse(0);
        }
        return 0;
    }

    @Override
    @Transactional
    public void deleteAllFileInf(FileVO fvo) throws Exception {
        if (fvo.getAtchFileId() != null) {
            fileMasterRepository.findById(fvo.getAtchFileId()).ifPresent(master -> {
                master.delete(); // Soft delete
                fileMasterRepository.save(master);
            });
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectFileListByFileNm(FileVO fvo) throws Exception {
        List<FileVO> result = new ArrayList<>();

        // Search by original file name (simplified)
        List<FileMaster> allMasters = fileMasterRepository.findAll();
        for (FileMaster master : allMasters) {
            for (FileDetail detail : master.getFileDetails()) {
                String searchNm = fvo.getOrignlFileNm();
                if (searchNm == null || detail.getOrignlFileNm().contains(searchNm)) {
                    result.add(convertToVO(master, detail));
                }
            }
        }

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", Integer.toString(result.size()));
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FileVO> selectImageFileList(FileVO vo) throws Exception {
        List<FileVO> result = new ArrayList<>();

        if (vo.getAtchFileId() != null) {
            fileMasterRepository.findById(vo.getAtchFileId()).ifPresent(master -> {
                for (FileDetail detail : master.getFileDetails()) {
                    // Check for image extensions
                    String ext = detail.getFileExtsn();
                    if (ext != null && (ext.equalsIgnoreCase("jpg") || ext.equalsIgnoreCase("jpeg") ||
                            ext.equalsIgnoreCase("png") || ext.equalsIgnoreCase("gif") ||
                            ext.equalsIgnoreCase("bmp"))) {
                        result.add(convertToVO(master, detail));
                    }
                }
            });
        }

        return result;
    }

    private FileVO convertToVO(FileMaster master, FileDetail detail) {
        FileVO vo = new FileVO();
        vo.setAtchFileId(master.getAtchFileId());
        vo.setFileSn(String.valueOf(detail.getFileSn()));
        vo.setFileStreCours(detail.getFileStreCours());
        vo.setStreFileNm(detail.getStreFileNm());
        vo.setOrignlFileNm(detail.getOrignlFileNm());
        vo.setFileExtsn(detail.getFileExtsn());
        vo.setFileMg(String.valueOf(detail.getFileMg()));
        vo.setFileCn(detail.getFileCn());
        return vo;
    }
}

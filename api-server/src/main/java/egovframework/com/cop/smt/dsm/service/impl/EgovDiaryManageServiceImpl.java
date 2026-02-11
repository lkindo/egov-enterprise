package egovframework.com.cop.smt.dsm.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.schedule.Diary;
import com.company.project.domain.schedule.DiaryRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.smt.dsm.service.DiaryManageVO;
import egovframework.com.cop.smt.dsm.service.EgovDiaryManageService;
import jakarta.annotation.Resource;

/**
 * 일지관리를 처리하는 ServiceImpl Class 구현
 * Refactored to use JPA (DiaryRepository)
 */
@Service("egovDiaryManageService")
public class EgovDiaryManageServiceImpl extends EgovAbstractServiceImpl implements EgovDiaryManageService {

    @Resource
    private DiaryRepository diaryRepository;

    @Resource(name = "diaryManageDao")
    private DiaryManageDao dao;

    @Resource(name = "diaryManageIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     * 일지관리 목록를(을) 조회한다.
     */
    @Override
    public List<EgovMap> selectDiaryManageList(ComDefaultVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                searchVO.getRecordCountPerPage(), Sort.by(Sort.Direction.DESC, "createdDate"));

        Page<Diary> page = diaryRepository.searchDiaries(searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                pageable);

        return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
    }

    /**
     * 일지관리를(을) 상세조회 한다.
     */
    @Override
    public DiaryManageVO selectDiaryManageDetail(DiaryManageVO diaryManageVO) throws Exception {
        return diaryRepository.findById(diaryManageVO.getDiaryId())
                .map(this::toVO)
                .orElse(null);
    }

    /**
     * 일지관리를(을) 목록 전체 건수를(을) 조회한다.
     */
    @Override
    public int selectDiaryManageListCnt(ComDefaultVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) diaryRepository.searchDiaries(searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                .getTotalElements();
    }

    /**
     * 일지관리를(을) 등록한다.
     */
    @Override
    @Transactional
    public void insertDiaryManage(DiaryManageVO diaryManageVO) throws Exception {
        String sMakeId = idgenService.getNextStringId();

        Diary diary = Diary.builder()
                .diaryId(sMakeId)
                .schdulId(diaryManageVO.getSchdulId())
                .diaryProcsPte(Integer.parseInt(diaryManageVO.getDiaryProcsPte()))
                .diaryNm(diaryManageVO.getDiaryNm())
                .drctMatter(diaryManageVO.getDrctMatter())
                .partclrMatter(diaryManageVO.getPartclrMatter())
                .atchFileId(diaryManageVO.getAtchFileId())
                .frstRegisterId(diaryManageVO.getFrstRegisterId())
                .build();

        diaryRepository.save(diary);
    }

    /**
     * 일지관리를(을) 수정한다.
     */
    @Override
    @Transactional
    public void updateDiaryManage(DiaryManageVO diaryManageVO) throws Exception {
        diaryRepository.findById(diaryManageVO.getDiaryId()).ifPresent(diary -> {
            diary.update(
                    Integer.parseInt(diaryManageVO.getDiaryProcsPte()),
                    diaryManageVO.getDiaryNm(),
                    diaryManageVO.getDrctMatter(),
                    diaryManageVO.getPartclrMatter(),
                    diaryManageVO.getAtchFileId(),
                    diaryManageVO.getLastUpdusrId());
        });
    }

    /**
     * 일지관리를(을) 삭제한다.
     */
    @Override
    @Transactional
    public void deleteDiaryManage(DiaryManageVO diaryManageVO) throws Exception {
        diaryRepository.deleteById(diaryManageVO.getDiaryId());
    }

    private EgovMap toEgovMap(Diary entity) {
        EgovMap map = new EgovMap();
        map.put("diaryId", entity.getDiaryId());
        map.put("schdulId", entity.getSchdulId());
        map.put("diaryProcsPte", entity.getDiaryProcsPte());
        map.put("diaryNm", entity.getDiaryNm());
        map.put("drctMatter", entity.getDrctMatter());
        map.put("partclrMatter", entity.getPartclrMatter());
        map.put("atchFileId", entity.getAtchFileId());
        map.put("frstRegisterPnttm", entity.getCreatedDate());
        map.put("frstRegisterId", entity.getFrstRegisterId());
        return map;
    }

    private DiaryManageVO toVO(Diary entity) {
        DiaryManageVO vo = new DiaryManageVO();
        vo.setDiaryId(entity.getDiaryId());
        vo.setSchdulId(entity.getSchdulId());
        vo.setDiaryProcsPte(String.valueOf(entity.getDiaryProcsPte()));
        vo.setDiaryNm(entity.getDiaryNm());
        vo.setDrctMatter(entity.getDrctMatter());
        vo.setPartclrMatter(entity.getPartclrMatter());
        vo.setAtchFileId(entity.getAtchFileId());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        return vo;
    }
}

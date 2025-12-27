package egovframework.let.sym.prm.service.impl;

import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.let.sym.prm.service.EgovProgrmManageService;
import egovframework.let.sym.prm.service.ProgrmManageDtlVO;
import egovframework.let.sym.prm.service.ProgrmManageVO;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 프로그램 목록 관리 서비스 구현 (JPA 전환)
 */
@Service("progrmManageService")
@Transactional(readOnly = true)
public class EgovProgrmManageServiceImpl extends EgovAbstractServiceImpl implements EgovProgrmManageService {

    @Resource
    private ProgramRepository programRepository;

    @Override
    @Transactional
    public void insertProgrm(ProgrmManageVO vo) throws Exception {
        Program program = Program.builder()
                .progrmFileNm(vo.getProgrmFileNm())
                .progrmStrePath(vo.getProgrmStrePath())
                .progrmKoreanNm(vo.getProgrmKoreanNm())
                .url(vo.getURL())
                .progrmDc(vo.getProgrmDc())
                .build();
        programRepository.save(program);
    }

    @Override
    @Transactional
    public void updateProgrm(ProgrmManageVO vo) throws Exception {
        programRepository.findById(vo.getProgrmFileNm()).ifPresent(program -> {
            program.update(
                    vo.getProgrmStrePath(),
                    vo.getProgrmKoreanNm(),
                    vo.getURL(),
                    vo.getProgrmDc());
        });
    }

    @Override
    @Transactional
    public void deleteProgrm(ProgrmManageVO vo) throws Exception {
        programRepository.deleteById(vo.getProgrmFileNm());
    }

    @Override
    public ProgrmManageVO selectProgrm(ComDefaultVO vo) throws Exception {
        return programRepository.findById(vo.getSearchKeyword())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<?> selectProgrmList(ComDefaultVO vo) throws Exception {
        Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageUnit());
        Page<Program> page = programRepository.searchByKeyword(vo.getSearchKeyword(), pageable);
        return page.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public int selectProgrmListTotCnt(ComDefaultVO vo) throws Exception {
        Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageUnit());
        Page<Program> page = programRepository.searchByKeyword(vo.getSearchKeyword(), pageable);
        return (int) page.getTotalElements();
    }

    @Override
    @Transactional
    public void deleteProgrmManageList(String checkedProgrmFileNmForDel) throws Exception {
        String[] delProgrmFileNm = checkedProgrmFileNmForDel.split(",");
        for (String id : delProgrmFileNm) {
            programRepository.deleteById(id);
        }
    }

    @Override
    public int selectProgrmNMTotCnt(ComDefaultVO vo) throws Exception {
        // ID check logic usually
        return programRepository.existsById(vo.getSearchKeyword()) ? 1 : 0;
    }

    // --- Legacy / Unused / Separate Domain Methods ---
    // Usually these related to Change Requests (NPROGRMCHANGEREQUST) or other
    // tables.
    // For Phase 5 we implement them as no-op or throw exception if not critical,
    // Or if simple, we could implement them but we lack Entity/Repository for
    // ChangeRequest.
    // Given the plan focused on Program Entity, I will return null/0 for now.

    @Override
    public ProgrmManageDtlVO selectProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
        return null;
    }

    @Override
    public List<?> selectProgrmChangeRequstList(ComDefaultVO vo) throws Exception {
        return null;
    }

    @Override
    public int selectProgrmChangeRequstListTotCnt(ComDefaultVO vo) throws Exception {
        return 0;
    }

    @Override
    public void insertProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
    }

    @Override
    public void updateProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
    }

    @Override
    public void deleteProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
    }

    @Override
    public ProgrmManageDtlVO selectProgrmChangeRequstNo(ProgrmManageDtlVO vo) throws Exception {
        return null;
    }

    @Override
    public List<?> selectChangeRequstProcessList(ComDefaultVO vo) throws Exception {
        return null;
    }

    @Override
    public int selectChangeRequstProcessListTotCnt(ComDefaultVO vo) throws Exception {
        return 0;
    }

    @Override
    public void updateProgrmChangeRequstProcess(ProgrmManageDtlVO vo) throws Exception {
    }

    @Override
    public ProgrmManageDtlVO selectRqesterEmail(ProgrmManageDtlVO vo) throws Exception {
        return null;
    }

    private ProgrmManageVO convertToVo(Program entity) {
        ProgrmManageVO vo = new ProgrmManageVO();
        vo.setProgrmFileNm(entity.getProgrmFileNm());
        vo.setProgrmStrePath(entity.getProgrmStrePath());
        vo.setProgrmKoreanNm(entity.getProgrmKoreanNm());
        vo.setURL(entity.getUrl());
        vo.setProgrmDc(entity.getProgrmDc());
        return vo;
    }
}

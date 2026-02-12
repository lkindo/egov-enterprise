package egovframework.com.cop.stf.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.EgovSatisfactionService;
import com.company.project.service.board.dto.BoardMasterDto;
import com.company.project.service.board.dto.SatisfactionDto;

import egovframework.com.cop.bbs.service.EgovBBSSatisfactionService;
import egovframework.com.cop.bbs.service.Satisfaction;
import egovframework.com.cop.bbs.service.SatisfactionVO;

/**
 * 만족도조사를 위한 서비스 구현 클래스 (JPA 전환 버전)
 */
@Service("EgovBBSSatisfactionService")
@org.springframework.context.annotation.Lazy
public class EgovBBSSatisfactionServiceImpl extends EgovAbstractServiceImpl implements EgovBBSSatisfactionService {

    @Resource(name = "egovSatisfactionService")
    private EgovSatisfactionService satisfactionService;

    @Resource(name = "egovBoardMasterService")
    private EgovBoardMasterService boardMasterService;

    /**
     * 만족도조사 사용 가능 여부를 확인한다.
     */
    @Override
    public boolean canUseSatisfaction(String bbsId) throws Exception {
        BoardMasterDto options = boardMasterService.getBoardMaster(bbsId);
        if (options == null) {
            return false;
        }
        return "Y".equals(options.getStsfdgAt());
    }

    /**
     * 만족도조사에 대한 목록을 조회 한다.
     */
    @Override
    public Map<String, Object> selectSatisfactionList(SatisfactionVO satisfactionVO) throws Exception {
        List<SatisfactionDto> list = satisfactionService.getSatisfactionList(satisfactionVO.getNttId(),
                satisfactionVO.getBbsId());
        Double summary = satisfactionService.getAverageSatisfaction(satisfactionVO.getNttId(),
                satisfactionVO.getBbsId());

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", list.stream().map(this::toVO).collect(Collectors.toList()));
        map.put("resultCnt", Integer.toString(list.size()));
        map.put("summary", summary != null ? summary.toString() : "0.0");

        return map;
    }

    /**
     * 만족도조사를 등록한다.
     */
    @Override
    public void insertSatisfaction(Satisfaction satisfaction) throws Exception {
        SatisfactionDto dto = toDto(satisfaction);
        satisfactionService.registerSatisfaction(dto);
    }

    /**
     * 만족도조사를 삭제한다.
     */
    @Override
    public void deleteSatisfaction(SatisfactionVO satisfactionVO) throws Exception {
        satisfactionService.deleteSatisfaction(Long.parseLong(satisfactionVO.getStsfdgNo()));
    }

    /**
     * 만족도조사에 대한 내용을 조회한다.
     */
    @Override
    public Satisfaction selectSatisfaction(SatisfactionVO satisfactionVO) throws Exception {
        SatisfactionDto dto = satisfactionService.getSatisfaction(Long.parseLong(satisfactionVO.getStsfdgNo()));
        return toVO(dto);
    }

    /**
     * 만족도조사에 대한 내용을 수정한다.
     */
    @Override
    public void updateSatisfaction(Satisfaction satisfaction) throws Exception {
        satisfactionService.updateSatisfaction(toDto(satisfaction));
    }

    /**
     * 만족도조사 패스워드를 가져온다.
     */
    @Override
    public String getSatisfactionPassword(Satisfaction satisfaction) throws Exception {
        SatisfactionDto dto = satisfactionService.getSatisfaction(Long.parseLong(satisfaction.getStsfdgNo()));
        return dto != null ? dto.getSatisfactionPassword() : "";
    }

    private SatisfactionVO toVO(SatisfactionDto dto) {
        if (dto == null)
            return null;
        SatisfactionVO vo = new SatisfactionVO();
        vo.setStsfdgNo(dto.getSatisfactionId() != null ? dto.getSatisfactionId().toString() : "");
        vo.setNttId(dto.getArticleId());
        vo.setBbsId(dto.getBoardId());
        vo.setWrterId(dto.getWriterId());
        vo.setWrterNm(dto.getWriterNm());
        vo.setStsfdg(dto.getSatisfactionLevel());
        vo.setStsfdgCn(dto.getSatisfactionOpinion());
        vo.setStsfdgPassword(dto.getSatisfactionPassword());
        vo.setUseAt(dto.getUseAt());
        return vo;
    }

    private SatisfactionDto toDto(Satisfaction vo) {
        if (vo == null)
            return null;
        return SatisfactionDto.builder()
                .satisfactionId(
                        vo.getStsfdgNo() != null && !vo.getStsfdgNo().isEmpty() ? Long.parseLong(vo.getStsfdgNo())
                                : null)
                .articleId(vo.getNttId())
                .boardId(vo.getBbsId())
                .writerId(vo.getWrterId())
                .writerNm(vo.getWrterNm())
                .satisfactionLevel(vo.getStsfdg())
                .satisfactionOpinion(vo.getStsfdgCn())
                .satisfactionPassword(vo.getStsfdgPassword())
                .useAt(vo.getUseAt())
                .build();
    }
}

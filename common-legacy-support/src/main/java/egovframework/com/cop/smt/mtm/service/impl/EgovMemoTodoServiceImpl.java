package egovframework.com.cop.smt.mtm.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.schedule.MemoTodo;
import com.company.project.domain.schedule.MemoTodoRepository;

import egovframework.com.cop.smt.mtm.service.EgovMemoTodoService;
import egovframework.com.cop.smt.mtm.service.MemoTodoVO;
import jakarta.annotation.Resource;

/**
 * ??
 * ????????ServiceImpl ?????? ???.
 * Refactored to use JPA (MemoTodoRepository)
 **/
@Service("EgovMemoTodoService")
public class EgovMemoTodoServiceImpl extends EgovAbstractServiceImpl implements EgovMemoTodoService {

    @Resource
    private MemoTodoRepository memoTodoRepository;

    @Resource(name = "egovMemoTodoIdGnrService")
    private EgovIdGnrService idgenServiceMemoTodo;

    /**
     * ?? ?????.
     **/
    @Override
    public Map<String, Object> selectMemoTodoList(MemoTodoVO memoTodoVO) throws Exception {
        Pageable pageable = PageRequest.of(memoTodoVO.getFirstIndex() / memoTodoVO.getRecordCountPerPage(),
                memoTodoVO.getRecordCountPerPage());

        // Simple string based date search for now to match legacy behavior
        LocalDateTime searchBgnDt = null;
        LocalDateTime searchEndDt = null;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        if (memoTodoVO.getSearchBgnDe() != null && !memoTodoVO.getSearchBgnDe().isEmpty()) {
            try {
                searchBgnDt = LocalDate.parse(memoTodoVO.getSearchBgnDe(), formatter).atStartOfDay();
            } catch (Exception e) {
                // Ignore parsing errors, pass null
            }
        }
        if (memoTodoVO.getSearchEndDe() != null && !memoTodoVO.getSearchEndDe().isEmpty()) {
            try {
                searchEndDt = LocalDate.parse(memoTodoVO.getSearchEndDe(), formatter).atTime(LocalTime.MAX);
            } catch (Exception e) {
                // Ignore
            }
        }

        Page<MemoTodo> page = memoTodoRepository.searchMemoTodos(
                memoTodoVO.getSearchId(),
                memoTodoVO.getSearchDe(),
                memoTodoVO.getSearchBgnDe(),
                memoTodoVO.getSearchEndDe(),
                searchBgnDt,
                searchEndDt,
                memoTodoVO.getSearchCondition(),
                memoTodoVO.getSearchWrd(),
                pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
        map.put("resultCnt", Long.toString(page.getTotalElements()));

        return map;
    }

    /**
     * ?? ??????.
     **/
    @Override
    public MemoTodoVO selectMemoTodo(MemoTodoVO memoTodoVO) throws Exception {
        return memoTodoRepository.findById(memoTodoVO.getTodoId())
                .map(this::toVO)
                .orElse(null);
    }

    /**
     * ?? ???????.
     **/
    @Override
    @Transactional
    public void updateMemoTodo(egovframework.com.cop.smt.mtm.service.MemoTodo memoTodo) throws Exception {
        memoTodoRepository.findById(memoTodo.getTodoId()).ifPresent(entity -> {
            entity.update(
                    memoTodo.getTodoNm(),
                    memoTodo.getTodoBeginTime(),
                    memoTodo.getTodoEndTime(),
                    memoTodo.getTodoCn(),
                    memoTodo.getLastUpdusrId());
        });
    }

    /**
     * ?? ??????.
     **/
    @Override
    @Transactional
    public void insertMemoTodo(egovframework.com.cop.smt.mtm.service.MemoTodo memoTodo) throws Exception {
        String id = idgenServiceMemoTodo.getNextStringId();

        MemoTodo entity = MemoTodo.builder()
                .todoId(id)
                .todoNm(memoTodo.getTodoNm())
                .todoBeginTime(memoTodo.getTodoBeginTime())
                .todoEndTime(memoTodo.getTodoEndTime())
                .wrterId(memoTodo.getWrterId())
                .todoCn(memoTodo.getTodoCn())
                .frstRegisterId(memoTodo.getFrstRegisterId())
                .build();

        memoTodoRepository.save(entity);
    }

    /**
     * ?? ????????.
     **/
    @Override
    @Transactional
    public void deleteMemoTodo(egovframework.com.cop.smt.mtm.service.MemoTodo memoTodo) throws Exception {
        memoTodoRepository.deleteById(memoTodo.getTodoId());
    }

    /**
     * ?? ????????????.
     **/
    @Override
    public List<MemoTodoVO> selectMemoTodoListToday(MemoTodoVO memoTodoVO) throws Exception {
        return memoTodoRepository.selectMemoTodoListToday(
                memoTodoVO.getSearchId(),
                memoTodoVO.getSearchBgnDe(),
                memoTodoVO.getSearchEndDe())
                .stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    private MemoTodoVO toVO(MemoTodo entity) {
        MemoTodoVO vo = new MemoTodoVO();
        vo.setTodoId(entity.getTodoId());
        vo.setTodoNm(entity.getTodoNm());
        vo.setTodoBeginTime(entity.getTodoBeginTime());
        vo.setTodoEndTime(entity.getTodoEndTime());
        vo.setWrterId(entity.getWrterId());
        vo.setTodoCn(entity.getTodoCn());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        vo.setFrstRegisterPnttm(entity.getCreatedDate() != null ? entity.getCreatedDate().toString() : "");
        return vo;
    }

}

package egovframework.com.sym.log.ulg.service.impl;

import com.company.project.domain.log.UserLogId;
import com.company.project.domain.log.UserLogRepository;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import egovframework.com.sym.log.ulg.service.EgovUserLogService;
import egovframework.com.sym.log.ulg.service.UserLog;

/**
 * 사용로그 관리를 위한 서비스 구현 클래스
 * 
 * @author 공통 서비스 개발팀 이삼섭
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 개정이력(Modification Information) ==
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.03.11  이삼섭          최초 생성
 *   2011.07.01  이기하          패키지 분리(sym.log -> sym.log.ulg)
 *   2025.07.14  이백행          2025년 컨트리뷰션 PMD로 소프트웨어 보안약점 진단하고 제거하기-LocalVariableNamingConventions(final이 아닌 변수는 밑줄을 포함할 수 없음)
 *
 *      </pre>
 */
@Service("EgovUserLogService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovUserLogServiceImpl extends EgovAbstractServiceImpl implements EgovUserLogService {

	private final UserLogRepository userLogRepository;

	@Override
	@Transactional
	public void logInsertUserLog() throws Exception {
		userLogRepository.insertLogSummary();
		userLogRepository.deleteOldLogs(210); // Matches legacy logic
	}

	@Override
	public UserLog selectUserLog(UserLog userLog) throws Exception {
		UserLogId id = new UserLogId(userLog.getOccrrncDe(), userLog.getRqesterId(), userLog.getSrvcNm(),
				userLog.getMethodNm());
		return userLogRepository.findById(id)
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public Map<String, Object> selectUserLogInf(UserLog userLog) throws Exception {
		Pageable pageable = PageRequest.of(userLog.getPageIndex() - 1, userLog.getRecordCountPerPage());
		Page<com.company.project.domain.log.UserLog> page = userLogRepository.searchUserLogs(
				userLog.getSearchWrd(), userLog.getSearchBgnDe(), userLog.getSearchEndDe(), pageable);

		Map<String, Object> resultMap = new HashMap<>();
		resultMap.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		resultMap.put("resultCnt", (int) page.getTotalElements());

		return resultMap;
	}

	private UserLog toVO(com.company.project.domain.log.UserLog entity) {
		UserLog vo = new UserLog();
		vo.setOccrrncDe(entity.getOccrrncDe());
		vo.setRqesterId(entity.getRqesterId());
		vo.setSrvcNm(entity.getSrvcNm());
		vo.setMethodNm(entity.getMethodNm());
		vo.setCreatCo(String.valueOf(entity.getCreatCo()));
		vo.setUpdtCo(String.valueOf(entity.getUpdtCo()));
		vo.setRdCnt(String.valueOf(entity.getRdCnt()));
		vo.setDeleteCo(String.valueOf(entity.getDeleteCo()));
		vo.setOutptCo(String.valueOf(entity.getOutptCo()));
		vo.setErrorCo(String.valueOf(entity.getErrorCo()));
		return vo;
	}

}
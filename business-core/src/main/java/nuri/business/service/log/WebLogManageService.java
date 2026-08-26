package nuri.business.service.log;

import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.log.WebLogRepository;
import nuri.business.service.log.dto.WebLogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 웹 로그 조회 서비스.
 *
 * <p>[왜 신설했나] {@code tb_web_log} 는 {@code WebAuditLogListener} 가 요청마다 적재하는데
 * <b>읽는 경로가 없었다</b> — 라이브 실측(2026-08-05) 28,104행이 쌓여 있는데 조회 API 가 0건이었다.
 * 관리 화면({@code /admin/system/logs/web})과 프론트 서비스 메서드
 * ({@code systemLogAdminService.getWebLogs()})는 이미 있었으므로, 빠진 것은 백엔드 배선뿐이었다.
 *
 * <p><b>조회 전용이다.</b> 쓰기는 {@code WebAuditLogListener} 가 담당하고 삭제는
 * {@code LogRetentionScheduler}(보존기간 정책)가 담당한다 — 이 서비스는 그 경로를 침범하지 않는다.
 * 감사 로그를 관리자가 임의로 수정·삭제할 수 있으면 증적으로서의 가치가 사라지기 때문이다.
 */
@Service
@Transactional(readOnly = true)
public class WebLogManageService extends BaseAbstractService {

    private final WebLogRepository webLogRepository;

    public WebLogManageService(WebLogRepository webLogRepository) {
        this.webLogRepository = required(webLogRepository, "WebLogRepository 는 null 일 수 없습니다");
    }

    /**
     * 웹 로그 목록 조회.
     *
     * <p>검색 술어는 이미 구현돼 있던 {@code WebLogRepositoryImpl.searchWebLogs} 를 그대로 쓴다
     * (URL 부분일치 + 발생일자 범위). 기간 파라미터는 {@code BaseSearchDto} 의
     * {@code searchKeywordFrom}/{@code searchKeywordTo} 를 그대로 넘긴다.
     *
     * <p>[2026-08-26 정정] 종전 주석은 "전용 필드가 없어 null 을 넘긴다" 였지만 <b>사실이 아니었다</b> —
     * 그 두 필드가 있고 시스템 로그·로그인 로그 서비스는 이미 기간 조건으로 쓰고 있었다. 그 결과 이
     * 로그만 화면이 보낸 기간이 <b>서비스 계층에서 조용히 버려졌다</b>(저장소는 처음부터 기간 조건을
     * 구현하고 있었다). 없는 계약을 지어내는 것이 아니라 이미 있는 계약을 연결한다.
     */
    public Page<WebLogDto> selectWebLogList(@NonNull BaseSearchDto searchDto) {
        // [2026-08-09] 종전에는 이 계산을 손수 했고, 나머지 13개소와 달리
        //   pageUnit 하한 가드가 없어 pageUnit=0 이면 PageRequest 가 IllegalArgumentException 을 던졌다
        //   (개인정보·사용자·웹 로그 조회에서 잘못된 질의 파라미터 하나로 500 이 났다).
        //   toPageable() 로 옮기면서 0 이하는 기본값 10 으로 수렴한다 — 나머지 호출부와 동일해진다.
        Pageable pageable = searchDto.toPageable();
        return webLogRepository
                .searchWebLogs(searchDto.getSearchKeyword(),
                        searchDto.getSearchKeywordFrom(), searchDto.getSearchKeywordTo(), pageable)
                .map(WebLogDto::from);
    }
}

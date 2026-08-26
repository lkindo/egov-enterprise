package nuri.business.service.log;

import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.log.UserLogRepository;
import nuri.business.service.log.dto.UserLogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 활동 로그 조회 서비스.
 *
 * <p>[왜 신설했나] 관리 화면 {@code /admin/system/logs/user} 와 프론트 메서드
 * {@code systemLogAdminService.getUserLogs()} 는 이미 있었으나 대응 엔드포인트가 없었다(D-1).
 *
 * <p><b>조회 전용이다.</b> 적재는 활동 집계 지점이, 삭제는 보존기간 정책
 * ({@code LogRetentionScheduler})과 회원 탈퇴 정리({@code UserLogRepository.deleteByDmndUserIdIn})가
 * 담당한다 — 이 서비스는 그 경로를 침범하지 않는다.
 *
 * <p>검색은 이미 구현돼 있던 {@code UserLogRepositoryImpl.searchUserLogs} 를 쓴다.
 * 그 술어는 <b>사용자명({@code User.userNm}) 조인 부분일치</b>라, 검색 대상이 로그 자신의 컬럼이
 * 아니라 연관 엔티티라는 점에 유의할 것(요청자 ID 로는 검색되지 않는다).
 */
@Service
@Transactional(readOnly = true)
public class UserLogManageService extends BaseAbstractService {

    private final UserLogRepository userLogRepository;

    public UserLogManageService(UserLogRepository userLogRepository) {
        this.userLogRepository = required(userLogRepository, "UserLogRepository 는 null 일 수 없습니다");
    }

    /**
     * 사용자 활동 로그 목록.
     *
     * <p>[2026-08-26 정정] 종전 주석은 "{@code BaseSearchDto} 에 기간 전용 필드가 없어 null 을 넘긴다"
     * 였지만 <b>사실이 아니었다</b> — {@code searchKeywordFrom}/{@code searchKeywordTo} 가 있고,
     * 시스템 로그·로그인 로그 서비스는 이미 그 필드를 기간 조건으로 넘기고 있었다. 그 결과 이 세
     * 로그(사용자·웹·개인정보)만 화면이 보낸 기간이 <b>서비스 계층에서 조용히 버려졌다</b>.
     * 저장소는 처음부터 기간 조건을 구현하고 있었으므로, 없는 계약을 지어내는 것이 아니라
     * 이미 있는 계약을 연결하는 것이다.
     */
    public Page<UserLogDto> selectUserLogList(@NonNull BaseSearchDto searchDto) {
        // [2026-08-09] 종전에는 이 계산을 손수 했고, 나머지 13개소와 달리
        //   pageUnit 하한 가드가 없어 pageUnit=0 이면 PageRequest 가 IllegalArgumentException 을 던졌다
        //   (개인정보·사용자·웹 로그 조회에서 잘못된 질의 파라미터 하나로 500 이 났다).
        //   toPageable() 로 옮기면서 0 이하는 기본값 10 으로 수렴한다 — 나머지 호출부와 동일해진다.
        Pageable pageable = searchDto.toPageable();
        return userLogRepository
                .searchUserLogs(searchDto.getSearchKeyword(),
                        searchDto.getSearchKeywordFrom(), searchDto.getSearchKeywordTo(), pageable)
                .map(UserLogDto::from);
    }
}

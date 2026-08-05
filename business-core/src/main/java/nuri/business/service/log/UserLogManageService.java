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
     * <p>{@code BaseSearchDto} 에 기간 전용 필드가 없어 시작·종료일에 <b>null 을 넘긴다</b> —
     * 없는 계약을 지어내지 않는다(웹·개인정보 로그와 동일 판단).
     */
    public Page<UserLogDto> selectUserLogList(@NonNull BaseSearchDto searchDto) {
        Pageable pageable = PageRequest.of(
                Math.max(0, searchDto.getPageIndex() - 1),
                searchDto.getPageUnit());
        return userLogRepository
                .searchUserLogs(searchDto.getSearchKeyword(), null, null, pageable)
                .map(UserLogDto::from);
    }
}

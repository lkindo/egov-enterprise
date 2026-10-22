package nuri.business.service.board;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.board.BoardChange;
import nuri.business.domain.board.BoardChangeRepository;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.BoardChangeDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시판 변경 이력 조회(ADR-0040 결정 9). 기록은 {@link BoardChangeRecorder} 가 변경과 같은 트랜잭션에서 한다.
 *
 * <p>게시글 행(PST)은 게시물 조회 대행 권한(BOARD_READ_ALL)이 있을 때만 싣는다 — 운영 화면 게시물 탭과 같은 조건이다(결정 2).
 * 게시판 관리 읽기 권한만으로 게시글의 처리 이력을 보면 게시물 탭의 권한을 돌아가게 된다(H3). 변경자는 이력의 esntlId 로
 * 이름을 페이지 단위 한 번에 찾고 연락처는 싣지 않는다(공통코드 변경 이력과 같다).
 */
@Service
@Transactional(readOnly = true)
public class BoardChangeService extends BaseAbstractService {

    private final BoardChangeRepository changeRepository;
    private final BoardMasterRepository boardMasterRepository;
    private final UserRepository userRepository;

    public BoardChangeService(BoardChangeRepository changeRepository, BoardMasterRepository boardMasterRepository,
            UserRepository userRepository) {
        this.changeRepository = required(changeRepository, "BoardChangeRepository 는 null 일 수 없습니다");
        this.boardMasterRepository = required(boardMasterRepository, "BoardMasterRepository 는 null 일 수 없습니다");
        this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
    }

    /** 한 게시판의 최신순 이력. 없는 게시판이면 404 다. */
    public Page<BoardChangeDto> getChanges(@NonNull String bbsId, @NonNull Pageable pageable) {
        if (!boardMasterRepository.existsById(Objects.requireNonNull(bbsId))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        Page<BoardChange> page = SecurityUtil.hasPermission("BOARD_READ_ALL")
                ? changeRepository.findByBbsIdOrderByCrtDtDescBbsChgHstrySnDesc(bbsId, pageable)
                : changeRepository.findByBbsIdAndChgTrgtTypeCdOrderByCrtDtDescBbsChgHstrySnDesc(
                        bbsId, BoardChangeRecorder.TARGET_BOARD, pageable);
        List<String> actors = page.getContent().stream()
                .map(BoardChange::getChgUserIdntfr)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<String, String> names = actors.isEmpty() ? Map.of()
                : userRepository.findByEsntlIdIn(actors).stream()
                        .filter(user -> user.getUserNm() != null)
                        .collect(Collectors.toMap(User::getEsntlId, User::getUserNm, (first, ignored) -> first));
        return page.map(change -> new BoardChangeDto(
                change.getBbsChgHstrySn(), change.getChgTrgtTypeCd(), change.getChgTypeCd(), change.getPstSn(),
                change.getChgArtclNm(), change.getChgBfrCn(), change.getChgAftrCn(),
                change.getChgUserIdntfr() == null ? null : names.get(change.getChgUserIdntfr()),
                change.getCrtDt()));
    }
}

package nuri.business.service.board;

import nuri.business.core.config.BoardIdProperties;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.BoardPostPeriodBatchRequest;
import nuri.business.service.board.dto.BoardPostPeriodRequest;
import nuri.business.service.board.dto.BoardPostPinBatchRequest;
import nuri.business.service.board.dto.BoardPostPinRequest;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.util.EntityVersions;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;

import static nuri.business.service.board.BoardPolicySupport.*;

/**
 * 게시판 운영 화면의 게시 기간·상단 고정 처리(ADR-0040 결정 3·5·9·10·12, 설계서 §6 B1·B2) — 단건과 일괄, 바뀐 항목의 변경 이력.
 *
 * <p>[2026-11-25 품질 평가 3순위 11] {@link BoardService} 에서 떼어 냈다. 운영자 경로라 작성자의 등록·수정·삭제와 권한·잠금·이력
 * 규칙이 다르다(BOARD_UPDATE_ALL·BOARD_PIN, 대상별 버전 없음, 변경 이력). 판정 본문과 순서는 옮기기 전과 같다. 게시판 진입·글 소속
 * 판정은 같은 의존성으로 직접 만든 {@link BoardAccessService} 에 맡긴다 — 프록시 없이 이 서비스의 쓰기 트랜잭션 안에서 마스터 행을
 * 잠근다.
 */
@Service
@Transactional(readOnly = true)
public class BoardPostOperationService extends BaseAbstractService {

        /** 게시판 변경 이력의 게시 기간 항목 이름(운영 화면의 이력 대화상자가 그대로 보인다). */
        static final String PERIOD_START_ITEM = "게시 시작일";
        static final String PERIOD_END_ITEM = "게시 종료일";

        /** 게시판 변경 이력의 상단 고정 항목 이름(ADR-0040 결정 9). */
        static final String PIN_ITEM = "상단 고정";
        static final String PIN_END_ITEM = "상단 고정 종료일";

        private final BoardRepository boardRepository;
        /** 운영 처리 이력 — 게시 기간 변경(B1)과 고정(B2)을 남긴다(ADR-0040 결정 9). */
        private final BoardChangeRecorder changeRecorder;
        private final BoardAccessService accessGate;

        /** 게시 기간 판정의 시계(ADR-0040 결정 3). */
        private Clock clock = Clock.system(BoardPolicySupport.SERVICE_ZONE);

        public BoardPostOperationService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        BoardIdProperties boardIdProperties,
                        BoardChangeRecorder changeRecorder,
                        @Nullable CommunityBoardAccessPort communityBoardAccess) {
                this.boardRepository = required(boardRepository, "boardRepository 는 null 일 수 없습니다");
                this.changeRecorder = required(changeRecorder, "changeRecorder 는 null 일 수 없습니다");
                this.accessGate = new BoardAccessService(this.boardRepository,
                                required(boardMasterRepository, "boardMasterRepository 는 null 일 수 없습니다"),
                                required(boardIdProperties, "boardIdProperties 는 null 일 수 없습니다"), communityBoardAccess);
        }

        /** 날짜 경계 회귀 시험에서 운영과 같은 시간대의 시계를 고정한다(ADR-0040 결정 3). 접근 판정도 같은 시계를 쓴다. */
        void useClock(Clock clock) {
                this.clock = java.util.Objects.requireNonNull(clock, "clock");
                accessGate.useClock(clock);
        }

        /** 게시 기간 판정의 기준일(yyyyMMdd, Asia/Seoul). 공개 메서드가 요청마다 한 번 부른다. */
        private String today() {
                return todayYmd(clock);
        }

        /**
         * 운영 화면 빠른 편집의 게시 기간 변경(ADR-0040 결정 3·9·10, 설계서 §6 B1). 게시글 전체 수정 권한(BOARD_UPDATE_ALL)이
         * 필요하고, 지정 게시판이면 그 편집 권한도 필요하다(쓰기 진입 판정). 제목·본문을 다시 보내지 않는다.
         *
         * <p>순서: 권한(403) → 게시판 쓰기 진입(지정 게시판 403·사용 여부 404·커뮤니티 403) → 경로 게시판 소속(404) → 버전(400·409)
         * → 날짜 규칙(400). 바뀐 항목만 게시판 변경 이력(PERIOD)에 남기고, 같은 값이면 이력도 버전도 그대로다. 대행 권한자의 경로라
         * 공개 뒤 시작일 변경 제한은 두지 않지만, 예약 게시를 받지 않는 게시판의 미래 시작일과 오늘보다 이른 종료일은 거부한다.
         * 종료일 해제는 받지 않는다 — 일괄 처리의 CLEAR_END 가 맡는다(결정 12).
         */
        @Transactional
        public void updatePostPeriod(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardPostPeriodRequest request) {
                SecurityUtil.assertPermission("BOARD_UPDATE_ALL");
                BoardMaster master = accessGate.loadWritableMaster(bbsId, false);
                Board board = accessGate.findPostInBoard(bbsId, pstSn);
                assertVersioned(board);
                EntityVersions.assertCurrent(request.version(), board.getVersion());

                String today = today();
                String storedStart = board.getPstBgngYmd();
                String storedEnd = board.getPstEndYmd();
                String start = requestedYmd(request.pstBgngYmd());
                String end = requestedYmd(request.pstEndYmd());
                boolean startChanged = startDateChanged(storedStart, start);
                boolean endChanged = end != null && !end.equals(normalizeYmd(storedEnd));
                if (startChanged) {
                        assertFutureStartAllowed(master, start, today);
                }
                if (endChanged) {
                        assertEndNotPast(end, today);
                }
                String nextStart = startChanged ? start : storedStart;
                String nextEnd = endChanged ? end : storedEnd;
                assertPeriodOrder(nextStart, nextEnd);

                changeRecorder.recordPost(bbsId, pstSn, BoardChangeRecorder.ChangeType.PERIOD, PERIOD_START_ITEM,
                                storedStart, nextStart);
                changeRecorder.recordPost(bbsId, pstSn, BoardChangeRecorder.ChangeType.PERIOD, PERIOD_END_ITEM,
                                storedEnd, nextEnd);
                board.changePostingPeriod(nextStart, nextEnd);
        }

        /**
         * 운영 화면의 게시 종료일 일괄 처리(ADR-0040 결정 9·10·12, 설계서 §6 B1). {@code END_DATE} 는 고른 글의 종료일을 바꾸고,
         * {@code CLEAR_END} 는 종료일을 비운다(기한 없음). 권한과 쓰기 진입 판정은 단건과 같다.
         *
         * <p><b>전체 미적용 원자성.</b> 모든 대상을 먼저 읽고 판정한다 — 하나라도 경로 게시판에 없거나(404) 새 종료일이 시작일보다
         * 앞이 되면(400, 글 번호 나열) 아무것도 바꾸지 않고 이력도 남기지 않는다. 대상별 버전은 받지 않는다(결정 10). 그 사이 작성자가
         * 같은 글을 커밋하면 저장 시점의 낙관적 잠금이 409 로 바꿔 전체를 되돌린다. 종료일이 실제로 바뀐 글만 버전이 오른다.
         */
        @Transactional
        public void updatePostPeriodsInBatch(@NonNull String bbsId, @NonNull BoardPostPeriodBatchRequest request) {
                SecurityUtil.assertPermission("BOARD_UPDATE_ALL");
                accessGate.loadWritableMaster(bbsId, false);

                String today = today();
                String end = requestedYmd(request.pstEndYmd());
                boolean clear = BoardPostPeriodBatchRequest.CLEAR_END.equals(request.action());
                if (clear) {
                        if (end != null) {
                                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                                "종료일 해제(CLEAR_END)에는 종료일을 보내지 않습니다.");
                        }
                } else if (BoardPostPeriodBatchRequest.END_DATE.equals(request.action())) {
                        if (end == null) {
                                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                                "종료일 바꾸기(END_DATE)에는 새 종료일이 필요합니다.");
                        }
                        assertEndNotPast(end, today);
                } else {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                        "action 은 END_DATE 또는 CLEAR_END 여야 합니다.");
                }

                // 1단계: 모든 대상을 읽고 판정한다 — 하나라도 어긋나면 아무것도 바꾸지 않는다.
                List<Board> targets = new java.util.ArrayList<>();
                for (Long id : required(request.pstSns(), "pstSns 는 null 일 수 없습니다").stream().distinct().toList()) {
                        targets.add(accessGate.findPostInBoard(bbsId, id));
                }
                // 버전이 비어 있는 옛 글은 고치지 않는다 — 이 경로는 요청 버전을 받지 않지만 저장할 때 버전을 올리므로,
                //   NULL 이면 Hibernate 가 버전을 늘리다 실패해 500 이 된다. 판정 단계에서 전체를 거절한다.
                List<String> unversioned = targets.stream()
                                .filter(target -> target.getVersion() == null)
                                .map(target -> String.valueOf(target.getPstSn()))
                                .toList();
                if (!unversioned.isEmpty()) {
                        throw new BusinessException(CommonErrorCode.INVALID_STATE,
                                        UNVERSIONED_POST_MESSAGE + " 아무것도 바꾸지 않았습니다: " + String.join(", ", unversioned));
                }
                if (!clear) {
                        List<String> reversed = targets.stream()
                                        .filter(target -> periodReversed(target.getPstBgngYmd(), end))
                                        .map(target -> String.valueOf(target.getPstSn()))
                                        .toList();
                        if (!reversed.isEmpty()) {
                                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                                "시작일보다 이른 종료일이 되는 글이 있어 아무것도 바꾸지 않았습니다: "
                                                                + String.join(", ", reversed));
                        }
                }

                // 2단계: 판정을 모두 지난 뒤에만 바꾸고 남긴다.
                for (Board target : targets) {
                        String storedEnd = target.getPstEndYmd();
                        String storedMeaning = storedEnd == null || storedEnd.isEmpty() ? null : normalizeYmd(storedEnd);
                        if (java.util.Objects.equals(storedMeaning, end)) {
                                continue;
                        }
                        changeRecorder.recordPost(bbsId, target.getPstSn(), BoardChangeRecorder.ChangeType.PERIOD,
                                        PERIOD_END_ITEM, storedEnd, end);
                        target.changePostingPeriod(target.getPstBgngYmd(), end);
                }
        }

        /**
         * 운영 화면의 게시글 하나 상단 고정·해제(ADR-0040 결정 5, 설계서 §6 B2). 규칙은 일괄 처리와 같다({@link #applyPins}).
         */
        @Transactional
        public void updatePostPin(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardPostPinRequest request) {
                applyPins(bbsId, List.of(required(pstSn, "pstSn 는 null 일 수 없습니다")),
                                request.upendFixYn(), request.upendFixEndYmd());
        }

        /**
         * 운영 화면의 상단 고정·해제 일괄 처리(ADR-0040 결정 5·10, 설계서 §6 B2). 고른 글 모두에 같은 고정 여부·종료일을 쓴다 —
         * 하나라도 맞지 않으면 아무것도 바꾸지 않는다({@link #applyPins}).
         */
        @Transactional
        public void updatePostPinsInBatch(@NonNull String bbsId, @NonNull BoardPostPinBatchRequest request) {
                applyPins(bbsId, required(request.pstSns(), "pstSns 는 null 일 수 없습니다"),
                                request.upendFixYn(), request.upendFixEndYmd());
        }

        /**
         * 상단 고정·해제의 한 경로(ADR-0040 결정 5·9·10). 게시글 상단 고정 권한(BOARD_PIN)이 필요하고, 지정 게시판이면 그 편집 권한도
         * 필요하다(쓰기 진입 판정).
         *
         * <p>순서: 권한(403) → 게시판 쓰기 진입(지정 게시판 403·사용 여부 404·커뮤니티 403)과 <b>마스터 행 잠금</b> → 모든 대상이 경로
         * 게시판의 지우지 않은 원글인지(404·답글 400) → 고정이면 게시판이 고정을 받는지(400), 종료일(비우면 기본 일수, 오늘보다 이르면
         * 400), 상한(400), 해제면 종료일 없음(있으면 400) → 바뀌는 글만 한 문장 UPDATE → 바뀐 항목만 변경 이력(PIN·UNPIN).
         *
         * <p><b>상한의 직렬화.</b> 같은 게시판의 동시 고정이 둘 다 상한 아래로 세고 함께 넘기지 않도록 집계 전에 마스터 행을 잠근다
         * (등록의 채번과 같은 잠금 — 잠금 순서는 마스터 행 → 게시글 행이다). 판정을 모두 지난 뒤에만 쓴다 — 하나라도 어긋나면
         * 아무것도 바꾸지 않고 이력도 남기지 않는다. 쓰기는 게시글 버전을 올리지 않는다 — 운영자 행위라 작성자 수정과 다투지 않는다.
         *
         * <p>정책을 끄거나 상한을 낮춰도 해제는 언제나 된다. 이미 고정 중인 글은 상한 집계에서 새로 세지 않는다(종료일만 바뀐다).
         */
        private void applyPins(String bbsId, List<Long> pstSns, String upendFixYn, String requestedEnd) {
                SecurityUtil.assertPermission("BOARD_PIN");
                boolean pin = parsePinRequest(upendFixYn);
                BoardMaster master = accessGate.loadWritableMaster(bbsId, true);

                List<Board> targets = new java.util.ArrayList<>();
                for (Long id : pstSns.stream().distinct().toList()) {
                        Board target = accessGate.findPostInBoard(bbsId, id);
                        // 고정한 답글이 원글과 떨어져 맨 위로 가지 않게 원글만 다룬다.
                        if (target.getUpPstSn() != null) {
                                throw new BusinessException(CommonErrorCode.INVALID_STATE,
                                                "답글은 상단에 고정할 수 없습니다. 원글을 골라 주세요: " + target.getPstSn());
                        }
                        targets.add(target);
                }

                String today = today();
                String end;
                if (pin) {
                        assertPinsAccepted(master);
                        end = pinEndYmd(master, requestedEnd, today);
                        long newlyActive = targets.stream()
                                        .filter(target -> !pinActive(target.getUpendFixYn(), target.getUpendFixEndYmd(), today))
                                        .count();
                        assertPinLimit(master, newlyActive, boardRepository.countActivePins(bbsId, today));
                } else {
                        if (requestedYmd(requestedEnd) != null) {
                                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                                "고정 해제에는 고정 종료일을 보내지 않습니다.");
                        }
                        end = null;
                }

                String yn = pin ? "Y" : "N";
                List<Board> changed = targets.stream()
                                .filter(target -> !yn.equals(target.getUpendFixYn())
                                                || !java.util.Objects.equals(end, target.getUpendFixEndYmd()))
                                .toList();
                if (changed.isEmpty()) {
                        return; // 이미 그 상태다 — 쓰지도 남기지도 않는다.
                }
                int affected = boardRepository.updatePin(bbsId, changed.stream().map(Board::getPstSn).toList(), yn, end);
                if (affected != changed.size()) {
                        // 판정 뒤 다른 요청이 글을 지웠다 — 일부만 고정하지 않고 전체를 되돌린다.
                        throw new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND);
                }
                BoardChangeRecorder.ChangeType type = pin
                                ? BoardChangeRecorder.ChangeType.PIN : BoardChangeRecorder.ChangeType.UNPIN;
                for (Board target : changed) {
                        changeRecorder.recordPost(bbsId, target.getPstSn(), type, PIN_ITEM, target.getUpendFixYn(), yn);
                        changeRecorder.recordPost(bbsId, target.getPstSn(), type, PIN_END_ITEM,
                                        target.getUpendFixEndYmd(), end);
                }
        }
}

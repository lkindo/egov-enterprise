package nuri.business.service.board;

import java.time.LocalDateTime;
import java.util.Objects;
import nuri.business.domain.board.BoardChange;
import nuri.business.domain.board.BoardChangeRepository;
import nuri.business.security.util.SecurityUtil;
import org.springframework.stereotype.Component;

/**
 * 게시판 운영 처리를 변경 이력(tb_bbs_chg_hstry)에 남긴다(ADR-0040 결정 9). 설정 저장·사용 여부 변경(설정 저장·일괄 상태
 * 변경·단건 비활성화)이 쓰고, 뒤 배치의 게시 기간 변경·고정이 같은 기록기를 쓴다.
 *
 * <p>호출부의 트랜잭션 안에서 바뀐 항목마다 한 건씩 추가한다 — 변경이 롤백되면 이력도 남지 않는다. 전후 값이 같으면 남기지 않는다.
 * 공통코드 변경 이력({@code CommonCodeService#recordChange})과 같은 규칙이다.
 */
@Component
public class BoardChangeRecorder {

    /** 대상 유형: 게시판. */
    public static final String TARGET_BOARD = "BBS";
    /** 대상 유형: 게시글. */
    public static final String TARGET_POST = "PST";

    /** 변경 유형. 값은 V2_139 의 CHECK 와 같다. */
    public enum ChangeType { SETTING, USE, PERIOD, PIN, UNPIN }

    private static final int CHANGE_TEXT_MAX = 4000;

    private final BoardChangeRepository repository;

    public BoardChangeRecorder(BoardChangeRepository repository) {
        this.repository = Objects.requireNonNull(repository, "BoardChangeRepository 는 null 일 수 없습니다");
    }

    /** 게시판 한 항목의 변경. 값이 같으면 아무것도 남기지 않는다. */
    public void recordBoard(String bbsId, ChangeType type, String item, Object before, Object after) {
        record(TARGET_BOARD, type, bbsId, null, item, before, after);
    }

    /** 게시글 한 항목의 변경(게시 기간·고정). 값이 같으면 아무것도 남기지 않는다. */
    public void recordPost(String bbsId, long pstSn, ChangeType type, String item, Object before, Object after) {
        record(TARGET_POST, type, bbsId, pstSn, item, before, after);
    }

    private void record(String target, ChangeType type, String bbsId, Long pstSn, String item, Object before, Object after) {
        String beforeText = text(before);
        String afterText = text(after);
        if (Objects.equals(beforeText, afterText)) {
            return;
        }
        repository.save(BoardChange.builder()
                .chgTrgtTypeCd(target)
                .chgTypeCd(type.name())
                .bbsId(bbsId)
                .pstSn(pstSn)
                .chgArtclNm(item)
                .chgBfrCn(beforeText)
                .chgAftrCn(afterText)
                .chgUserIdntfr(SecurityUtil.getCurrentEsntlId().orElse(null))
                .frstRgtrId(SecurityUtil.getCurrentLoginId().orElse("SYSTEM"))
                .crtDt(LocalDateTime.now())
                .build());
    }

    private static String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString();
        return text.length() <= CHANGE_TEXT_MAX ? text : text.substring(0, CHANGE_TEXT_MAX);
    }
}

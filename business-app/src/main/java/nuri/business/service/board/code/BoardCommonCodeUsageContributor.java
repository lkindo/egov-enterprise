package nuri.business.service.board.code;

import nuri.foundation.core.code.CommonCodeUsageContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 게시판 기능이 읽는 공통코드 그룹 — 게시판 속성(COM009).
 *
 * <p>{@code BoardMasterRepositoryImpl#searchBoardMasters} 가 게시판 속성 코드의 이름을 이 그룹에서 읽어 게시판 관리 목록
 * 응답({@code bbsAtrbCdNm})에 싣는다. 조인에 사용 여부 조건이 없어 '사용 안 함'으로 바꾼 상세 코드의 이름도 그대로 실린다.
 * 2026-10-20 판독으로 그 이름을 보이는 화면은 없다.
 */
@Component
public class BoardCommonCodeUsageContributor implements CommonCodeUsageContributor {

    @Override
    public Collection<Usage> commonCodeUsages() {
        return List.of(new Usage("COM009",
                "게시판 관리 목록 API 가 게시판 속성 코드의 이름을 이 그룹에서 읽어 응답에 싣습니다. "
                        + "상세 코드의 사용 여부와 상관없이 이름을 싣고, 지금 그 이름을 보이는 화면은 없습니다."));
    }
}

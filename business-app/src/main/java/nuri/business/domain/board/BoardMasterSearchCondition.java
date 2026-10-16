package nuri.business.domain.board;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BoardMasterSearchCondition {
    private String useYn;
    /** 게시판명 검색어. 검색 축은 게시판명 하나다(유형 이름 축은 COM004 와 함께 걷었다 — DEC-OPS-332). */
    private String searchWrd;
    private String trgtId;
    private boolean notUsedOnly;
}

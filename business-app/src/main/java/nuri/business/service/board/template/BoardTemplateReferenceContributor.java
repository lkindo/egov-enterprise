package nuri.business.service.board.template;

import nuri.business.domain.board.BoardMasterRepository;
import nuri.foundation.core.template.TemplateReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * 게시판 마스터({@code tb_bbs_master.tmplt_id})의 템플릿 참조 건수를 템플릿 도메인에 알려 준다.
 * 게시판이 base projection 에서 빠지면 이 contributor 도 함께 빠진다.
 */
@Component
public class BoardTemplateReferenceContributor implements TemplateReferenceContributor {

    /**
     * 구현된 레이아웃 코드는 원장 행·경로와 독립적이다. 미해석 레거시 ID는 기존 보호를 유지한다. [2026-10-26 ADR-0043 결정 5] 목록은
     * 게시판 생성 요청 검사와 같은 {@link nuri.business.service.board.dto.BoardLayoutIds} 하나다.
     */
    private static final java.util.Set<String> BUILT_IN_LAYOUTS =
            java.util.Set.copyOf(nuri.business.service.board.dto.BoardLayoutIds.ALL);

    private final BoardMasterRepository boardMasterRepository;

    public BoardTemplateReferenceContributor(BoardMasterRepository boardMasterRepository) {
        this.boardMasterRepository = Objects.requireNonNull(boardMasterRepository);
    }

    @Override
    public String sourceLabel() {
        return "게시판";
    }

    @Override
    public long countReferences(String tmpltId) {
        if (BUILT_IN_LAYOUTS.contains(tmpltId)) return 0;
        return boardMasterRepository.countByTmpltId(tmpltId);
    }
}

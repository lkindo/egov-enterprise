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
        return boardMasterRepository.countByTmpltId(tmpltId);
    }
}

package nuri.business.service.board.attachment;

import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 게시판 도메인이 소유한 첨부 참조원.
 *
 * <p>자료 이용 기록({@code tb_dta_use_stats})은 게시글과 그 첨부를 가리키는 게시판 데이터라 여기서 함께 등록한다.
 * 종전에는 통계 도메인이 따로 등록해, 게시판이 빠진 구성에서도 이 참조원이 남거나 통계가 빠지면 사라졌다.
 */
@Component
public class BoardAttachmentSourceContributor implements AttachmentSourceContributor {
    @Override
    public Collection<AttachmentSource> sources() {
        return List.of(AttachmentSource.BOARD, AttachmentSource.DATA_USE_STATS);
    }
}

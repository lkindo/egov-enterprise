package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.board.exception.BoardErrorCode;

import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardMasterSearchResult;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterMapper;
import nuri.business.domain.board.BoardMasterSearchCondition;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.foundation.core.util.IdGenerationUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardMasterService extends BaseAbstractService {

    private final BoardMasterRepository boardMasterRepository;
    private final BoardRepository boardRepository;
    private final BoardMasterMapper boardMasterMapper;

    @PersistenceContext
    private EntityManager entityManager;

    public Page<BoardMasterDto> getBoardMasterList(String searchCondition, String searchKeyword, @NonNull Pageable pageable) {
        BoardMasterSearchCondition cond = new BoardMasterSearchCondition();
        cond.setSearchCnd(searchCondition);
        cond.setSearchWrd(searchKeyword);
        return boardMasterRepository.searchBoardMasters(cond, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    public List<BoardMasterDto> getBoardMasterList(String searchCondition, String searchKeyword) {
        Pageable pageable = PageRequest.of(0, 1000);
        return getBoardMasterList(searchCondition, searchKeyword, pageable).getContent();
    }

    public BoardMasterDto getBoardMaster(@NonNull String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(boardMasterMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String createBoardMaster(String userId, BoardMasterDto dto) {
        String bbsId = dto.getBbsId();
        if (bbsId == null || bbsId.isEmpty()) {
            bbsId = IdGenerationUtil.generateUniqueId("BBSMSTR_", 12, boardMasterRepository::existsById);
        }

        BoardMaster entity = BoardMaster.builder()
                .bbsId(bbsId)
                .bbsTtl(dto.getBbsTtl())
                .bbsExpln(dto.getBbsExpln())
                .bbsTypeCd(dto.getBbsTypeCd())
                .bbsAtrbCd(dto.getBbsAtrbCd())
                .ansPsbltyYn(dto.getAnsPsbltyYn())
                .fileAtchPsbltyYn(dto.getFileAtchPsbltyYn())
                .atchPsbltyFileQty(dto.getAtchPsbltyFileQty())
                .atchPsbltyFileSz(dto.getAtchPsbltyFileSz())
                .tmpltId(dto.getTmpltId())
                .useYn(dto.getUseYn())
                .blogSn(dto.getBlogSn())
                .blogYn(dto.getBlogYn())
                .cmntySn(dto.getCmntySn())
                .ansYn(dto.getAnsYn())
                .stsfdgYn(dto.getStsfdgYn())
                .build();
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
        entity.registerOption(dto.getAnsYn(), dto.getStsfdgYn());
        // assigned String @Id + @MapsId 옵션은 save()→merge 경로에서 옵션에 spurious UPDATE(낙관적 락 409)를
        // 유발한다. 신규 생성이므로 persist 로 명시 INSERT 한다.
        entityManager.persist(entity);
        return entity.getBbsId();
    }

    @Transactional
    public void updateBoardMaster(String userId, BoardMasterDto dto) {
        BoardMaster entity = boardMasterRepository.findById(Objects.requireNonNull(dto.getBbsId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        String bbsTtl = dto.getBbsTtl() != null ? dto.getBbsTtl() : entity.getBbsTtl();
        String bbsExpln = dto.getBbsExpln() != null ? dto.getBbsExpln() : entity.getBbsExpln();
        String ansPsbltyYn = dto.getAnsPsbltyYn() != null ? dto.getAnsPsbltyYn() : entity.getAnsPsbltyYn();
        String fileAtchPsbltyYn = dto.getFileAtchPsbltyYn() != null ? dto.getFileAtchPsbltyYn() : entity.getFileAtchPsbltyYn();
        Integer atchPsbltyFileQty = dto.getAtchPsbltyFileQty() != null ? dto.getAtchPsbltyFileQty() : entity.getAtchPsbltyFileQty();
        Long atchPsbltyFileSz = dto.getAtchPsbltyFileSz() != null ? dto.getAtchPsbltyFileSz() : entity.getAtchPsbltyFileSz();
        String tmpltId = dto.getTmpltId() != null ? dto.getTmpltId() : entity.getTmpltId();
        String useYn = dto.getUseYn() != null ? dto.getUseYn() : entity.getUseYn();
        String ansYn = dto.getAnsYn() != null ? dto.getAnsYn() : entity.getAnsYn();
        String stsfdgYn = dto.getStsfdgYn() != null ? dto.getStsfdgYn() : entity.getStsfdgYn();

        entity.update(bbsTtl, bbsExpln, ansPsbltyYn, fileAtchPsbltyYn,
                atchPsbltyFileQty, atchPsbltyFileSz, tmpltId, useYn,
                ansYn, stsfdgYn);
        
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteBoardMaster(String userId, String bbsId) {
        BoardMaster entity = boardMasterRepository.findById(bbsId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.delete();
        entity.setLastMdfrId(userId);
    }

    public boolean isDeletable(String bbsId) {
        java.util.Optional<BoardMaster> o = boardMasterRepository.findById(bbsId);
        if (o.isEmpty()) {
            return false;
        }
        BoardMaster master = o.get();
        if (!"N".equals(master.getUseYn())) {
            return false;
        }
        long count = boardRepository.countAllByBbsId(bbsId);
        return count == 0;
    }

    @Transactional
    public void deleteBoardMasterPhysically(String userId, String bbsId) {
        BoardMaster master = boardMasterRepository.findById(bbsId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        if (!"N".equals(master.getUseYn())) {
            throw new BusinessException(BoardErrorCode.CANNOT_DELETE_ACTIVE_BOARD);
        }

        long count = boardRepository.countAllByBbsId(bbsId);
        if (count > 0) {
            throw new BusinessException(BoardErrorCode.BOARD_HAS_ARTICLES);
        }

        boardMasterRepository.deleteById(bbsId);
    }

    @Transactional
    public void updateBoardMasterStatusInBatch(String userId, List<String> bbsIds, String useYn) {
        if (bbsIds == null || bbsIds.isEmpty()) {
            return;
        }
        for (String bbsId : bbsIds) {
            BoardMaster entity = boardMasterRepository.findById(bbsId)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            entity.updateUseYn(useYn);
            entity.setLastMdfrId(userId);
        }
    }

    @Transactional
    public void deleteBoardMastersInBatch(String userId, List<String> bbsIds) {
        if (bbsIds == null || bbsIds.isEmpty()) {
            return;
        }
        for (String bbsId : bbsIds) {
            BoardMaster master = boardMasterRepository.findById(bbsId)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

            if (!"N".equals(master.getUseYn())) {
                throw new BusinessException(BoardErrorCode.CANNOT_DELETE_ACTIVE_BOARD);
            }

            long count = boardRepository.countAllByBbsId(bbsId);
            if (count > 0) {
                throw new BusinessException(BoardErrorCode.BOARD_HAS_ARTICLES);
            }

            boardMasterRepository.delete(master);
        }
    }

    // --- Added back for test compatibility ---
    public boolean canUseSatisfaction(String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(m -> "Y".equals(m.getStsfdgYn()))
                .orElse(false);
    }

    public boolean canUseComment(String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(m -> "Y".equals(m.getAnsYn()))
                .orElse(false);
    }

    private BoardMasterDto toDto(BoardMasterSearchResult projection) {
        return BoardMasterDto.builder()
                .bbsId(projection.getBbsId())
                .bbsTtl(projection.getBbsTtl())
                .bbsTypeCd(projection.getBbsTypeCd())
                .bbsAtrbCd(projection.getBbsAtrbCd())
                .tmpltId(projection.getTmpltId())
                .useYn(projection.getUseYn())
                .crtDt(projection.getCrtDt())
                .build();
    }
}

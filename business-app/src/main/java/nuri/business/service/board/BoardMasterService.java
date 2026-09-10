package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.board.exception.BoardErrorCode;

import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardMasterSearchResult;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterMapper;
import nuri.business.service.board.dto.CommunityBoardDto;
import nuri.business.domain.board.BoardMasterSearchCondition;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.foundation.core.util.IdGenerationUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class BoardMasterService extends BaseAbstractService {

    private final BoardMasterRepository boardMasterRepository;
    private final BoardRepository boardRepository;
    private final BoardMasterMapper boardMasterMapper;
    /**
     * 커뮤니티 귀속 판정 포트. 커뮤니티 도메인이 base projection 에서 빠지면 {@code null} 이고,
     * 그때 커뮤니티 귀속 게시판 목록은 관리자 외에게 닫힌다(fail-closed — {@link BoardService} 와 같은 규칙).
     */
    private final nuri.foundation.core.community.CommunityBoardAccessPort communityBoardAccess;

    public BoardMasterService(BoardMasterRepository boardMasterRepository,
            BoardRepository boardRepository,
            BoardMasterMapper boardMasterMapper,
            @org.springframework.lang.Nullable nuri.foundation.core.community.CommunityBoardAccessPort communityBoardAccess) {
        this.boardMasterRepository = boardMasterRepository;
        this.boardRepository = boardRepository;
        this.boardMasterMapper = boardMasterMapper;
        this.communityBoardAccess = communityBoardAccess;
    }

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

    /**
     * 커뮤니티에 귀속된 활성 게시판 목록 — <b>승인된 회원(또는 관리자)만</b> 볼 수 있다.
     *
     * <p>[2026-09-08 PD-CMTY-001] {@code findByCmntySnAndUseYn} 은 V2_0 이후 선언만 있고 호출자가
     * 0 이었다(GAP-CMTY-001). 이 메서드가 그 첫 소비자이며, 회원 자격이 처음으로 무언가를 연다.
     *
     * <p>인가는 {@link BoardService#assertCommunityAccess} 와 <b>같은 규칙</b>이다 — 관리자는 통과,
     * 그 밖에는 승인된 회원만, 포트가 없으면 거부. 목록만 열고 글 내용은 게시판 진입 시점에 같은
     * 게이트가 다시 판정한다(이중 검증).
     */
    public List<CommunityBoardDto> getCommunityBoards(@NonNull Long cmntySn) {
        assertCommunityMember(Objects.requireNonNull(cmntySn, "cmntySn 는 null 일 수 없습니다"));
        return boardMasterRepository.findByCmntySnAndUseYn(cmntySn, "Y").stream()
                .map(CommunityBoardDto::from)
                .toList();
    }

    private void assertCommunityMember(Long cmntySn) {
        if (nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_READ_ALL")) {
            return;
        }
        String esntlId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId().orElse(null);
        if (esntlId == null || communityBoardAccess == null
                || !communityBoardAccess.isApprovedMember(cmntySn, esntlId)) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED,
                    "커뮤니티 회원만 게시판 목록을 볼 수 있습니다.");
        }
    }

    /**
     * 게시판을 없는 커뮤니티에 귀속시키지 못하게 막는다.
     *
     * <p>[2026-09-08 PD-CMTY-001] {@code cmnty_sn} 에는 물리 FK 가 없어(V2_0) 오타 한 번이면 아무도
     * 회원일 수 없는 게시판이 만들어지고, 그 게시판은 관리자 외에게 영구히 닫힌다. 권한 저장 경로가
     * 같은 이유로 존재를 먼저 확인하는 선례({@code assertAuthoritiesExist}, GAP-AUTH-002)를 따른다.
     */
    private void assertCommunityExists(Long cmntySn) {
        if (cmntySn == null) {
            return;
        }
        if (communityBoardAccess == null || !communityBoardAccess.exists(cmntySn)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND,
                    "커뮤니티를 찾을 수 없습니다: " + cmntySn);
        }
    }

    public BoardMasterDto getBoardMaster(@NonNull String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(boardMasterMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String createBoardMaster(String userId, BoardMasterDto dto) {
        assertCommunityExists(dto.getCmntySn());
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
        List<String> distinctBbsIds = bbsIds.stream().distinct().toList();
        List<BoardMaster> masters = loadBoardMastersInRequestOrder(distinctBbsIds);
        for (BoardMaster entity : masters) {
            entity.updateUseYn(useYn);
            entity.setLastMdfrId(userId);
        }
    }

    @Transactional
    public void deleteBoardMastersInBatch(String userId, List<String> bbsIds) {
        if (bbsIds == null || bbsIds.isEmpty()) {
            return;
        }
        List<String> distinctBbsIds = bbsIds.stream().distinct().toList();
        List<BoardMaster> masters = loadBoardMastersInRequestOrder(distinctBbsIds);
        Set<String> bbsIdsHavingArticles = new HashSet<>(
                boardRepository.findBbsIdsHavingAnyArticles(distinctBbsIds));

        // 모든 대상을 먼저 검증한 뒤 삭제를 시작해, 뒤쪽 대상의 실패가 앞쪽 엔티티 삭제를
        // 이미 예약하는 부분 성공 상태를 만들지 않게 한다.
        for (BoardMaster master : masters) {
            if (!"N".equals(master.getUseYn())) {
                throw new BusinessException(BoardErrorCode.CANNOT_DELETE_ACTIVE_BOARD);
            }

            if (bbsIdsHavingArticles.contains(master.getBbsId())) {
                throw new BusinessException(BoardErrorCode.BOARD_HAS_ARTICLES);
            }
        }

        // deleteAllInBatch는 JPQL bulk delete라 BoardMaster.option의 cascade/orphanRemoval을 우회하고
        // 자식 FK를 남긴다. fetch join으로 적재한 옵션의 cascade를 보존하는 deleteAll을 한 번 호출하며,
        // 실제 DELETE 문은 전역 hibernate.jdbc.batch_size 설정에 따라 JDBC batch로 묶인다.
        boardMasterRepository.deleteAll(masters);
    }

    private List<BoardMaster> loadBoardMastersInRequestOrder(List<String> distinctBbsIds) {
        Map<String, BoardMaster> mastersById = boardMasterRepository
                .findAllWithOptionByBbsIdIn(distinctBbsIds).stream()
                .collect(Collectors.toMap(BoardMaster::getBbsId, master -> master, (first, ignored) -> first));
        if (mastersById.size() != distinctBbsIds.size()
                || !mastersById.keySet().containsAll(distinctBbsIds)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        return distinctBbsIds.stream().map(mastersById::get).toList();
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
                .bbsTypeCdNm(projection.getBbsTypeCdNm())
                .bbsAtrbCd(projection.getBbsAtrbCd())
                .bbsAtrbCdNm(projection.getBbsAtrbCdNm())
                .tmpltId(projection.getTmpltId())
                .useYn(projection.getUseYn())
                .crtDt(projection.getCrtDt())
                .build();
    }
}

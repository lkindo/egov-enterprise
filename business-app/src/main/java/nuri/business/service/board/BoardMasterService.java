package nuri.business.service.board;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.board.exception.BoardErrorCode;

import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardMasterSearchResult;
import nuri.business.core.config.BoardIdProperties;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterMapper;
import nuri.business.service.board.dto.BoardMasterUpdateRequest;
import nuri.business.service.board.dto.CommunityBoardDto;
import nuri.business.domain.board.BoardMasterSearchCondition;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.foundation.core.util.EntityVersions;
import nuri.foundation.core.util.IdGenerationUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
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
    private final CommunityBoardAccessPort communityBoardAccess;
    /** 운영 처리 변경 이력(ADR-0040 결정 9). */
    private final BoardChangeRecorder changeRecorder;
    /** 설정이 지정한 공지·FAQ·업무 게시판(게시판 관리 목록의 지정 표지). */
    private final BoardIdProperties boardIdProperties;
    /** 영구 삭제의 대상 게시판을 민감 작업 원장에 남긴다(ADR-0040 결정 9). 핸들러 표지는 누가·언제를, 이 기록은 무엇을 남긴다. */
    private final SensitiveAuditPort sensitiveAudit;

    public BoardMasterService(BoardMasterRepository boardMasterRepository,
            BoardRepository boardRepository,
            BoardMasterMapper boardMasterMapper,
            @Nullable CommunityBoardAccessPort communityBoardAccess,
            BoardChangeRecorder changeRecorder,
            BoardIdProperties boardIdProperties,
            SensitiveAuditPort sensitiveAudit) {
        this.boardMasterRepository = boardMasterRepository;
        this.boardRepository = boardRepository;
        this.boardMasterMapper = boardMasterMapper;
        this.communityBoardAccess = communityBoardAccess;
        this.changeRecorder = Objects.requireNonNull(changeRecorder, "BoardChangeRecorder 는 null 일 수 없습니다");
        this.boardIdProperties = Objects.requireNonNull(boardIdProperties, "BoardIdProperties 는 null 일 수 없습니다");
        this.sensitiveAudit = Objects.requireNonNull(sensitiveAudit, "SensitiveAuditPort 는 null 일 수 없습니다");
    }

    /** 영구 삭제 대상의 원장 작업 이름. 같은 요청의 핸들러 기록(시도·완료)과 요청 ID 로 이어진다. */
    static final String PURGE_AUDIT_OPERATION = "BOARD_MASTER_PURGE";

    /** 지정 용도: 공지(공지 편집 권한·업무 홈 공지 카드), FAQ(FAQ 편집 권한·공개 FAQ), 업무(업무 홈 업무 카드). */
    public static final String DESIGNATION_NOTICE = "NOTICE";
    public static final String DESIGNATION_FAQ = "FAQ";
    public static final String DESIGNATION_TASK = "TASK";

    /**
     * 설정({@code nuri.boards.*})이 이 게시판을 어느 용도로 지정했는지 정해진 순서(공지·FAQ·업무)로 돌려준다. 같은 게시판이
     * 여러 용도면 모두 싣는다 — 기본 설정은 공지와 FAQ 가 한 게시판이다. 지정 게시판은 사용 안 함으로 바꾸거나 지우기 전에
     * 운영자가 알아야 한다(ADR-0040 §5.2). 게시글 편집 권한 판정({@code BoardService#requiredEditPermissions})과 뜻이 다른
     * 축이라 합치지 않는다(H4).
     */
    public List<String> designationsOf(String bbsId) {
        List<String> designations = new java.util.ArrayList<>(3);
        if (Objects.equals(bbsId, boardIdProperties.getNoticeId())) designations.add(DESIGNATION_NOTICE);
        if (Objects.equals(bbsId, boardIdProperties.getFaqId())) designations.add(DESIGNATION_FAQ);
        if (Objects.equals(bbsId, boardIdProperties.getTaskId())) designations.add(DESIGNATION_TASK);
        return List.copyOf(designations);
    }

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * 게시판 마스터 목록. 검색어는 게시판명에 건다(DEC-OPS-332 — 검색 축은 게시판명 하나다). 사용 여부는 비우면 전체, Y·N 이면
     * 그 상태만이고 그 밖의 값은 400 이다(ADR-0040 §5.2 — 잘못된 조건으로 조용히 전체를 주지 않는다, ADR-0036).
     */
    public Page<BoardMasterDto> getBoardMasterList(String searchKeyword, @Nullable String useYn, @NonNull Pageable pageable) {
        BoardMasterSearchCondition cond = new BoardMasterSearchCondition();
        cond.setSearchWrd(searchKeyword);
        cond.setUseYn(parseUseYn(useYn));
        return boardMasterRepository.searchBoardMasters(cond, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    public List<BoardMasterDto> getBoardMasterList(String searchKeyword) {
        Pageable pageable = PageRequest.of(0, 1000);
        return getBoardMasterList(searchKeyword, null, pageable).getContent();
    }

    private static @Nullable String parseUseYn(@Nullable String useYn) {
        if (useYn == null || useYn.isBlank()) {
            return null;
        }
        if (!"Y".equals(useYn) && !"N".equals(useYn)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "사용 여부 조건은 Y 또는 N 입니다.");
        }
        return useYn;
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
        // [2026-09-26 DIP B4 P5] 게시판 진입 게이트(BoardService#assertCommunityAccess)가 통과시키는 전체 열람 권한자도
        //   목록을 본다 — 종전에는 목록만 BBS_MST_READ_ALL 로 판정해 들어갈 수 있는 관리자가 목록을 보지 못했다.
        if (nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_READ_ALL")
                || nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")) {
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

    /**
     * 게시판 설정을 고친다(ADR-0040 결정 10·§5.5). 화면이 읽은 버전과 지금 버전이 다르면 409 다. 템플릿·유형·속성·커뮤니티 귀속은
     * 요청에 없어 바뀌지 않는다. 보내지 않은 선택 항목은 지금 값을 유지한다. 바뀐 항목마다 변경 이력을 남긴다(결정 9).
     */
    @Transactional
    public void updateBoardMaster(String userId, @NonNull String bbsId, BoardMasterUpdateRequest request) {
        BoardMaster entity = boardMasterRepository.findById(Objects.requireNonNull(bbsId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // 값을 합치기 전에 대조한다 — 늦은 저장이 앞 저장을 덮지 않게 한다.
        EntityVersions.assertCurrent(request.getVersion(), entity.getVersion());
        SettingSnapshot before = SettingSnapshot.of(entity);

        // 저장값과 뜻이 같은 요청값은 저장값을 그대로 둔다 — 화면은 건드리지 않은 칸도 정규화해 보낸다(빈 소개 '', 빈 크기 0,
        //   빈 답글 허용 N, 앞뒤 공백을 지운 명칭·소개). 그대로 쓰면 운영자가 바꾸지 않은 항목이 이력에 남고 저장값도 조용히 바뀐다.
        String bbsTtl = keepIfSameMeaning(entity.getBbsTtl(), request.getBbsTtl(), value -> value == null ? "" : value.strip());
        String bbsExpln = keepIfSameMeaning(entity.getBbsExpln(), request.getBbsExpln(), value -> value == null ? "" : value.strip());
        String ansPsbltyYn = keepIfSameMeaning(entity.getAnsPsbltyYn(), request.getAnsPsbltyYn(),
                value -> "Y".equals(value) ? "Y" : "N");
        String fileAtchPsbltyYn = request.getFileAtchPsbltyYn() != null ? request.getFileAtchPsbltyYn() : entity.getFileAtchPsbltyYn();
        Integer atchPsbltyFileQty = request.getAtchPsbltyFileQty() != null ? request.getAtchPsbltyFileQty() : entity.getAtchPsbltyFileQty();
        // 0 이하와 NULL 은 모두 '게시판 상한 없음(서버 전역 상한)' 이다(BoardPolicySupport#assertNewFilesAllowed).
        Long atchPsbltyFileSz = keepIfSameMeaning(entity.getAtchPsbltyFileSz(), request.getAtchPsbltyFileSz(),
                value -> value == null || value <= 0 ? 0L : value);
        String useYn = request.getUseYn() != null ? request.getUseYn() : entity.getUseYn();
        String ansYn = request.getAnsYn() != null ? request.getAnsYn() : entity.getAnsYn();
        String stsfdgYn = request.getStsfdgYn() != null ? request.getStsfdgYn() : entity.getStsfdgYn();

        entity.update(bbsTtl, bbsExpln, ansPsbltyYn, fileAtchPsbltyYn,
                atchPsbltyFileQty, atchPsbltyFileSz, entity.getTmpltId(), useYn,
                ansYn, stsfdgYn);

        SettingSnapshot after = SettingSnapshot.of(entity);
        // 바뀐 값이 없으면 수정자도 쓰지 않는다 — 수정자만 바뀌어도 행이 고쳐져 버전이 올라, 그 사이 설정을 연 다른 운영자가
        //   아무것도 바뀌지 않았는데 409 를 받는다.
        if (!after.equals(before)) {
            entity.setLastMdfrId(userId);
        }
        before.recordChangesTo(after, entity.getBbsId(), changeRecorder);
    }

    /** 요청값이 없거나 저장값과 뜻이 같으면 저장값, 아니면 요청값이다. */
    private static <T> T keepIfSameMeaning(T stored, T requested, java.util.function.Function<T, Object> meaning) {
        if (requested == null) return stored;
        return Objects.equals(meaning.apply(stored), meaning.apply(requested)) ? stored : requested;
    }

    /**
     * 단건 비활성화. 요청 버전을 받지 않지만 {@code @Version} 을 올리므로 그 사이에 열어 둔 설정 저장은 409 가 된다(결정 10).
     * 사용 중이던 게시판이면 사용 여부 변경을 이력에 남긴다(결정 9).
     */
    @Transactional
    public void deleteBoardMaster(String userId, String bbsId) {
        BoardMaster entity = boardMasterRepository.findById(bbsId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        String beforeUse = entity.getUseYn();
        if ("N".equals(beforeUse)) {
            return; // 이미 사용 안 함이면 고치지 않는다(버전·수정자·이력 그대로).
        }
        entity.delete();
        entity.setLastMdfrId(userId);
        changeRecorder.recordBoard(entity.getBbsId(), BoardChangeRecorder.ChangeType.USE, SettingSnapshot.USE_ITEM,
                beforeUse, entity.getUseYn());
    }

    /**
     * 변경 이력에 남길 게시판 설정 값과 그 표시 이름(화면의 설정 대화상자 이름과 같다). 사용 여부는 USE, 나머지는 SETTING 이다.
     * 첨부 크기는 저장 단위(바이트) 그대로 남긴다.
     */
    private record SettingSnapshot(String bbsTtl, String bbsExpln, String ansPsbltyYn, String fileAtchPsbltyYn,
            Integer atchPsbltyFileQty, Long atchPsbltyFileSz, String ansYn, String stsfdgYn, String useYn) {
        static final String USE_ITEM = "게시판 사용";

        static SettingSnapshot of(BoardMaster master) {
            return new SettingSnapshot(master.getBbsTtl(), master.getBbsExpln(), master.getAnsPsbltyYn(),
                    master.getFileAtchPsbltyYn(), master.getAtchPsbltyFileQty(), master.getAtchPsbltyFileSz(),
                    master.getAnsYn(), master.getStsfdgYn(), master.getUseYn());
        }

        void recordChangesTo(SettingSnapshot after, String bbsId, BoardChangeRecorder recorder) {
            BoardChangeRecorder.ChangeType setting = BoardChangeRecorder.ChangeType.SETTING;
            recorder.recordBoard(bbsId, setting, "게시판 명칭", bbsTtl, after.bbsTtl);
            recorder.recordBoard(bbsId, setting, "게시판 소개", bbsExpln, after.bbsExpln);
            recorder.recordBoard(bbsId, setting, "답글 허용", ansPsbltyYn, after.ansPsbltyYn);
            recorder.recordBoard(bbsId, setting, "댓글 받기", ansYn, after.ansYn);
            recorder.recordBoard(bbsId, setting, "만족도 평가 받기", stsfdgYn, after.stsfdgYn);
            recorder.recordBoard(bbsId, setting, "파일 첨부 허용", fileAtchPsbltyYn, after.fileAtchPsbltyYn);
            recorder.recordBoard(bbsId, setting, "첨부 파일 수", atchPsbltyFileQty, after.atchPsbltyFileQty);
            recorder.recordBoard(bbsId, setting, "파일당 크기(바이트)", atchPsbltyFileSz, after.atchPsbltyFileSz);
            recorder.recordBoard(bbsId, BoardChangeRecorder.ChangeType.USE, USE_ITEM, useYn, after.useYn);
        }
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
        return !hasAnyArticleRow(bbsId);
    }

    /**
     * 게시글 행이 하나라도 남아 있는가 — 물리 FK 가 보는 집합 그대로다(논리 삭제 글 포함).
     *
     * <p>[2026-10-23 ADR-0040 A0] 종전 단건 판정은 JPQL COUNT 라 서비스 안에서 켜지는 soft-delete 필터에 걸려 논리 삭제 글을
     * 빼고 셌다. 그래서 논리 삭제 글만 남은 게시판은 "삭제 가능" 으로 보인 뒤 물리 삭제에서 FK 로 실패했다. 일괄 판정과 같은
     * 네이티브 질의 하나로 판정한다.
     */
    private boolean hasAnyArticleRow(String bbsId) {
        return !boardRepository.findBbsIdsHavingAnyArticles(List.of(bbsId)).isEmpty();
    }

    @Transactional
    public void deleteBoardMasterPhysically(String userId, String bbsId) {
        BoardMaster master = boardMasterRepository.findById(bbsId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        if (!"N".equals(master.getUseYn())) {
            throw new BusinessException(BoardErrorCode.CANNOT_DELETE_ACTIVE_BOARD);
        }

        if (hasAnyArticleRow(bbsId)) {
            throw new BusinessException(BoardErrorCode.BOARD_HAS_ARTICLES);
        }

        boardMasterRepository.deleteById(bbsId);
        // 같은 트랜잭션에 남긴다 — 원장 기록이 실패하면 삭제도 되돌아간다(SensitiveAuditPort#recordMutation 은 MANDATORY).
        sensitiveAudit.recordMutation(PURGE_AUDIT_OPERATION, bbsId);
    }

    @Transactional
    public void updateBoardMasterStatusInBatch(String userId, List<String> bbsIds, String useYn) {
        if (bbsIds == null || bbsIds.isEmpty()) {
            return;
        }
        List<String> distinctBbsIds = bbsIds.stream().distinct().toList();
        List<BoardMaster> masters = loadBoardMastersInRequestOrder(distinctBbsIds);
        for (BoardMaster entity : masters) {
            String beforeUse = entity.getUseYn();
            // [2026-10-23 ADR-0040 결정 9·10] 상태가 실제로 바뀐 게시판만 고치고 남긴다 — 이미 그 상태인 게시판은 수정자·버전·
            //   이력이 그대로다(수정자만 써도 버전이 올라 열어 둔 설정 화면이 이유 없이 409 를 받는다).
            if (!Objects.equals(beforeUse, useYn)) {
                entity.updateUseYn(useYn);
                entity.setLastMdfrId(userId);
            }
            changeRecorder.recordBoard(entity.getBbsId(), BoardChangeRecorder.ChangeType.USE, SettingSnapshot.USE_ITEM,
                    beforeUse, entity.getUseYn());
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
        for (BoardMaster master : masters) {
            sensitiveAudit.recordMutation(PURGE_AUDIT_OPERATION, master.getBbsId());
        }
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

    private BoardMasterDto toDto(BoardMasterSearchResult projection) {
        return BoardMasterDto.builder()
                .bbsId(projection.getBbsId())
                .bbsTtl(projection.getBbsTtl())
                .bbsTypeCd(projection.getBbsTypeCd())
                .bbsAtrbCd(projection.getBbsAtrbCd())
                .bbsAtrbCdNm(projection.getBbsAtrbCdNm())
                .tmpltId(projection.getTmpltId())
                .useYn(projection.getUseYn())
                .crtDt(projection.getCrtDt())
                .build();
    }
}

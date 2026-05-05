package nuri.business.service.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import nuri.business.domain.board.*;
import lombok.extern.slf4j.Slf4j;
import nuri.business.service.board.dto.BlogDto;
import nuri.business.service.board.dto.BoardMasterDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service("egovBoardMasterService")
public class BoardMasterService extends BaseAbstractService implements EgovBoardMasterService {

    private final BoardMasterRepository boardMasterRepository;
    private final BlogRepository blogRepository;
    private final BlogUserRepository blogUserRepository;
    private final BoardUseRepository boardUseRepository;
    private final EgovIdGnrService idgenService;

    public BoardMasterService(BoardMasterRepository boardMasterRepository,
            BlogRepository blogRepository,
            BlogUserRepository blogUserRepository,
            BoardUseRepository boardUseRepository,
            @Qualifier("egovBBSMstrIdGnrService") EgovIdGnrService idgenService) {
        this.boardMasterRepository = required(boardMasterRepository, "boardMasterRepository 는 null 일 수 없습니다");
        this.blogRepository = required(blogRepository, "blogRepository 는 null 일 수 없습니다");
        this.blogUserRepository = required(blogUserRepository, "blogUserRepository 는 null 일 수 없습니다");
        this.boardUseRepository = required(boardUseRepository, "boardUseRepository 는 null 일 수 없습니다");
        this.idgenService = required(idgenService, "idgenService 는 null 일 수 없습니다");
    }

    @Override
    @Transactional(readOnly = true)
    public BoardMasterDto getBoardMaster(@NonNull String bbsId) {
        BoardMaster entity = boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return BoardMasterDto.from(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BoardMasterDto> getBoardMasterList(String searchCnd, String searchWrd, @NonNull Pageable pageable) {
        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchCnd(searchCnd);
        condition.setSearchWrd(searchWrd);

        return boardMasterRepository.searchBoardMasters(condition, required(pageable, "pageable 는 null 일 수 없습니다"))
                .map(this::convertSearchResultToDto);
    }

    private BoardMasterDto convertSearchResultToDto(BoardMasterSearchResult r) {
        return BoardMasterDto.builder()
                .bbsId(r.getBbsId())
                .bbsNm(r.getBbsNm())
                .bbsTyCode(r.getBbsTyCode())
                .bbsAttrbCode(r.getBbsAttrbCode())
                .tmplatId(r.getTmplatId())
                .useAt(r.getUseAt())
                .build();
    }

    @Override
    @Transactional
    public String createBoardMaster(BoardMasterDto dto) {
        String bbsId;
        try {
            bbsId = idgenService.getNextStringId();
        } catch (Exception e) {
            throw new BusinessException("Failed to generate ID", ErrorCode.INTERNAL_SERVER_ERROR);
        }

        BoardMaster entity = BoardMaster.builder()
                .bbsId(bbsId)
                .bbsNm(dto.getBbsNm())
                .bbsIntrcn(dto.getBbsIntrcn())
                .bbsTyCode(dto.getBbsTyCode())
                .bbsAttrbCode(dto.getBbsAttrbCode())
                .replyPosblAt(dto.getReplyPosblAt())
                .fileAtchPosblAt(dto.getFileAtchPosblAt())
                .atchPosblFileNumber(dto.getAtchPosblFileNumber())
                .atchPosblFileSize(dto.getAtchPosblFileSize())
                .tmplatId(dto.getTmplatId())
                .useAt("Y")
                .createdBy(dto.getFrstRegisterId())
                .lastModifiedBy(dto.getFrstRegisterId())
                .cmmntyId(dto.getCmmntyId())
                .blogId(dto.getBlogId())
                .blogAt(dto.getBlogAt() != null ? dto.getBlogAt() : "N") // Ensure default
                .commentAt(dto.getCommentAt() != null ? dto.getCommentAt() : "N") // Ensure default
                .stsfdgAt(dto.getStsfdgAt() != null ? dto.getStsfdgAt() : "N") // Ensure default
                .optnFrstRegisterId(dto.getFrstRegisterId())
                .optnFrstRegistPnttm(java.time.LocalDateTime.now())
                .optnLastUpdusrId(dto.getFrstRegisterId())
                .optnLastUpdtPnttm(java.time.LocalDateTime.now())
                .build();

        boardMasterRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
        return bbsId;
    }

    @Override
    @Transactional
    public void updateBoardMaster(BoardMasterDto dto) {
        BoardMaster entity = boardMasterRepository.findById(required(dto.getBbsId(), "dto.getBbsId() 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (dto.getBbsNm() != null) entity.updateBbsNm(dto.getBbsNm());
        if (dto.getBbsIntrcn() != null) entity.updateBbsIntrcn(dto.getBbsIntrcn());
        if (dto.getReplyPosblAt() != null) entity.updateReplyPosblAt(dto.getReplyPosblAt());
        if (dto.getFileAtchPosblAt() != null) entity.updateFileAtchPosblAt(dto.getFileAtchPosblAt());
        if (dto.getAtchPosblFileNumber() != null) entity.updateAtchPosblFileNumber(dto.getAtchPosblFileNumber());
        if (dto.getAtchPosblFileSize() != null) entity.updateAtchPosblFileSize(dto.getAtchPosblFileSize());
        if (dto.getTmplatId() != null) entity.updateTmplatId(dto.getTmplatId());
        if (dto.getUseAt() != null) entity.updateUseAt(dto.getUseAt());
        if (dto.getCommentAt() != null) entity.updateCommentAt(dto.getCommentAt());
        if (dto.getStsfdgAt() != null) entity.updateStsfdgAt(dto.getStsfdgAt());
    }

    @Override
    @Transactional
    public void deleteBoardMaster(String bbsId, String userId) {
        BoardMaster entity = boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 1. 게시판 사용 정보 삭제 (물리 삭제)
        boardUseRepository.deleteByBbsId(bbsId);
        
        // 2. 게시판 마스터 정보 삭제 (물리 삭제)
        // 기존 entity.delete()는 useAt='N'만 수행하므로 목록에 계속 남음.
        // 사용자가 "완전 삭제"를 원하므로 repository.delete() 호출
        boardMasterRepository.delete(entity);
        
        log.info("BoardMaster deleted: {} by user: {}", bbsId, userId);
    }

    @Override
    public boolean canUseSatisfaction(String bbsId) {
        return boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                .map(bm -> "Y".equals(bm.getStsfdgAt()))
                .orElse(false);
    }

    @Override
    public boolean canUseComment(String bbsId) {
        return boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                .map(bm -> "Y".equals(bm.getCommentAt()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BlogDto> getBlogList(String searchCnd, String searchWrd, @NonNull Pageable pageable) {
        // QueryDSL 기반 검색이 필요할 수 있으나 현재는 단순 findAll로 처리 (필요시 Custom Repository 추가)
        return blogRepository.findAll(required(pageable, "pageable 는 null 일 수 없습니다")).map(BlogDto::from);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogDto getBlog(String blogId) {
        return blogRepository.findById(required(blogId, "blogId 는 null 일 수 없습니다")).map(BlogDto::from).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean checkBlogUser(String frstRegisterId) {
        return blogRepository.existsByCreatedBy(frstRegisterId);
    }

    @Override
    @Transactional
    public void createBlog(BlogDto dto) {
        Blog entity = Blog.builder()
                .blogId(dto.getBlogId())
                .bbsId(dto.getBbsId())
                .blogNm(dto.getBlogNm())
                .blogIntrcn(dto.getBlogIntrcn())
                .registSeCode(dto.getRegistSeCode())
                .tmplatId(dto.getTmplatId())
                .useAt(dto.getUseAt())
                .createdBy(dto.getFrstRegisterId())
                .blogAt(dto.getBlogAt())
                .build();
        blogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    @Transactional
    public void joinBlog(String blogId, String userId, String mngrAt) {
        BlogUser user = BlogUser.builder()
                .blogId(blogId)
                .emplyrId(userId)
                .mngrAt(mngrAt)
                .useAt("Y")
                .createdBy(userId)
                .build();
        blogUserRepository.save(required(user, "user 는 null 일 수 없습니다"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlogDto> getBlogListPortlet() {
        return blogRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "frstRegisterPnttm")))
                .getContent().stream()
                .map(BlogDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BoardMasterDto> getBoardMasterListPortlet() {
        return boardMasterRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "frstRegisterPnttm")))
                .getContent().stream()
                .map(BoardMasterDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BoardMasterDto> getBoardMasterListByCommunity(String cmmntyId) {
        return boardMasterRepository.findByCmmntyIdAndUseAt(required(cmmntyId, "cmmntyId 는 null 일 수 없습니다"), "Y")
                .stream()
                .map(BoardMasterDto::from)
                .collect(Collectors.toList());
    }
}

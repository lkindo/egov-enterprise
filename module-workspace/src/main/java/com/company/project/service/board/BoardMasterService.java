package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.*;
import com.company.project.service.board.dto.BlogDto;
import com.company.project.service.board.dto.BoardMasterDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
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
import java.util.Objects;
import java.util.stream.Collectors;

@Service("egovBoardMasterService")
public class BoardMasterService extends EgovAbstractServiceImpl implements EgovBoardMasterService {

    private final BoardMasterRepository boardMasterRepository;
    private final BlogRepository blogRepository;
    private final BlogUserRepository blogUserRepository;
    private final EgovIdGnrService idgenService;

    public BoardMasterService(BoardMasterRepository boardMasterRepository,
            BlogRepository blogRepository,
            BlogUserRepository blogUserRepository,
            @Qualifier("egovBBSMstrIdGnrService") EgovIdGnrService idgenService) {
        this.boardMasterRepository = boardMasterRepository;
        this.blogRepository = blogRepository;
        this.blogUserRepository = blogUserRepository;
        this.idgenService = idgenService;
    }

    @Override
    @Transactional(readOnly = true)
    public BoardMasterDto getBoardMaster(@NonNull String bbsId) {
        BoardMaster entity = boardMasterRepository.findById(Objects.requireNonNull(bbsId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return BoardMasterDto.from(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BoardMasterDto> getBoardMasterList(String searchCnd, String searchWrd, @NonNull Pageable pageable) {
        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchCnd(searchCnd);
        condition.setSearchWrd(searchWrd);

        return boardMasterRepository.searchBoardMasters(condition, Objects.requireNonNull(pageable))
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

        boardMasterRepository.save(Objects.requireNonNull(entity));
        return bbsId;
    }

    @Override
    @Transactional
    public void updateBoardMaster(BoardMasterDto dto) {
        BoardMaster entity = boardMasterRepository.findById(Objects.requireNonNull(dto.getBbsId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(
                dto.getBbsNm(),
                dto.getBbsIntrcn(),
                dto.getReplyPosblAt(),
                dto.getFileAtchPosblAt(),
                dto.getAtchPosblFileNumber(),
                dto.getAtchPosblFileSize(),
                dto.getTmplatId(),
                dto.getUseAt(),
                dto.getCommentAt(),
                dto.getStsfdgAt());
    }

    @Override
    @Transactional
    public void deleteBoardMaster(String bbsId, String userId) {
        BoardMaster entity = boardMasterRepository.findById(Objects.requireNonNull(bbsId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.delete();
    }

    @Override
    public boolean canUseSatisfaction(String bbsId) {
        return boardMasterRepository.findById(Objects.requireNonNull(bbsId))
                .map(bm -> "Y".equals(bm.getStsfdgAt()))
                .orElse(false);
    }

    @Override
    public boolean canUseComment(String bbsId) {
        return boardMasterRepository.findById(Objects.requireNonNull(bbsId))
                .map(bm -> "Y".equals(bm.getCommentAt()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BlogDto> getBlogList(String searchCnd, String searchWrd, @NonNull Pageable pageable) {
        // QueryDSL 기반 검색이 필요할 수 있으나 현재는 단순 findAll로 처리 (필요시 Custom Repository 추가)
        return blogRepository.findAll(Objects.requireNonNull(pageable)).map(BlogDto::from);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogDto getBlog(String blogId) {
        return blogRepository.findById(Objects.requireNonNull(blogId)).map(BlogDto::from).orElse(null);
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
        blogRepository.save(Objects.requireNonNull(entity));
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
        blogUserRepository.save(Objects.requireNonNull(user));
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
        return boardMasterRepository.findByCmmntyIdAndUseAt(Objects.requireNonNull(cmmntyId), "Y")
                .stream()
                .map(BoardMasterDto::from)
                .collect(Collectors.toList());
    }
}

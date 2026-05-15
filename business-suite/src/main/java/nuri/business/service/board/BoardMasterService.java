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
                .bbsTtl(r.getBbsTtl())
                .bbsTypeCd(r.getBbsTypeCd())
                .bbsAttrCd(r.getBbsAttrCd())
                .tmplatId(r.getTmplatId())
                .useYn(r.getUseYn())
                .build();
    }

    @Override
    @Transactional
    public String createBoardMaster(BoardMasterDto dto) {
        if (!nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        
        String bbsId;
        try {
            bbsId = idgenService.getNextStringId();
        } catch (Exception e) {
            throw new BusinessException("Failed to generate ID", ErrorCode.INTERNAL_SERVER_ERROR);
        }

        BoardMaster entity = BoardMaster.builder()
                .bbsId(bbsId)
                .bbsTtl(dto.getBbsTtl())
                .bbsIntroCn(dto.getBbsIntroCn())
                .bbsTypeCd(dto.getBbsTypeCd())
                .bbsAttrCd(dto.getBbsAttrCd())
                .replyPsblYn(dto.getReplyPsblYn())
                .fileAtchPsblYn(dto.getFileAtchPsblYn())
                .atchPsblFileCnt(dto.getAtchPsblFileCnt())
                .atchPsblFileSize(dto.getAtchPsblFileSize())
                .tmplatId(dto.getTmplatId())
                .useYn("Y")
                .createdBy(dto.getFrstRegisterId())
                .lastModifiedBy(dto.getFrstRegisterId())
                .cmntyId(dto.getCmntyId())
                .blogId(dto.getBlogId())
                .blogYn(dto.getBlogYn() != null ? dto.getBlogYn() : "N")
                .commentYn(dto.getCommentYn() != null ? dto.getCommentYn() : "N")
                .stsfdgYn(dto.getStsfdgYn() != null ? dto.getStsfdgYn() : "N")
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
        if (!nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        BoardMaster entity = boardMasterRepository.findById(required(dto.getBbsId(), "dto.getBbsId() 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (dto.getBbsTtl() != null) entity.updateBbsTtl(dto.getBbsTtl());
        if (dto.getBbsIntroCn() != null) entity.updateBbsIntroCn(dto.getBbsIntroCn());
        if (dto.getReplyPsblYn() != null) entity.updateReplyPsblYn(dto.getReplyPsblYn());
        if (dto.getFileAtchPsblYn() != null) entity.updateFileAtchPsblYn(dto.getFileAtchPsblYn());
        if (dto.getAtchPsblFileCnt() != null) entity.updateAtchPsblFileCnt(dto.getAtchPsblFileCnt());
        if (dto.getAtchPsblFileSize() != null) entity.updateAtchPsblFileSize(dto.getAtchPsblFileSize());
        if (dto.getTmplatId() != null) entity.updateTmplatId(dto.getTmplatId());
        if (dto.getUseYn() != null) entity.updateUseYn(dto.getUseYn());
        if (dto.getCommentYn() != null) entity.updateCommentYn(dto.getCommentYn());
        if (dto.getStsfdgYn() != null) entity.updateStsfdgYn(dto.getStsfdgYn());
    }

    @Override
    @Transactional
    public void deleteBoardMaster(String bbsId, String userId) {
        if (!nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        BoardMaster entity = boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        boardUseRepository.deleteByBbsId(bbsId);
        boardMasterRepository.delete(entity);
    }

    @Override
    public boolean canUseSatisfaction(String bbsId) {
        return boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                .map(bm -> "Y".equals(bm.getStsfdgYn()))
                .orElse(false);
    }

    @Override
    public boolean canUseComment(String bbsId) {
        return boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                .map(bm -> "Y".equals(bm.getCommentYn()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BlogDto> getBlogList(String searchCnd, String searchWrd, @NonNull Pageable pageable) {
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
                .blogTtl(dto.getBlogTtl())
                .blogIntroCn(dto.getBlogIntroCn())
                .regTypeCd(dto.getRegTypeCd())
                .tmplatId(dto.getTmplatId())
                .useYn(dto.getUseYn())
                .createdBy(dto.getFrstRegisterId())
                .blogYn(dto.getBlogYn())
                .build();
        blogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    @Transactional
    public void joinBlog(String blogId, String userId, String mngrYn) {
        BlogUser user = BlogUser.builder()
                .blogId(blogId)
                .userId(userId)
                .mngrYn(mngrYn)
                .useYn("Y")
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
    public List<BoardMasterDto> getBoardMasterListByCommunity(String cmntyId) {
        return boardMasterRepository.findByCmntyIdAndUseYn(required(cmntyId, "cmntyId 는 null 일 수 없습니다"), "Y")
                .stream()
                .map(BoardMasterDto::from)
                .collect(Collectors.toList());
    }
}

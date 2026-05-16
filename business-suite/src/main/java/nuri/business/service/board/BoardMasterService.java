package nuri.business.service.board;

import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardMasterSearchResult;
import nuri.business.domain.board.Blog;
import nuri.business.domain.board.BlogUser;
import nuri.business.domain.board.BlogRepository;
import nuri.business.domain.board.BlogUserRepository;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BlogDto;
import nuri.business.domain.board.BoardMasterSearchCondition;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardMasterService extends BaseAbstractService implements EgovBoardMasterService {

    private final BoardMasterRepository boardMasterRepository;
    private final EgovIdGnrService egovBBSMstrIdGnrService;

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
                .map(BoardMasterDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String createBoardMaster(String userId, BoardMasterDto dto) {
        String bbsId = dto.getBbsId();
        if (bbsId == null || bbsId.isEmpty()) {
            try {
                bbsId = egovBBSMstrIdGnrService.getNextStringId();
            } catch (Exception e) {
                throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to generate BBS ID");
            }
        }

        BoardMaster entity = BoardMaster.builder()
                .bbsId(bbsId)
                .bbsTtl(dto.getBbsTtl())
                .bbsExpln(dto.getBbsExpln())
                .bbsTypeCd(dto.getBbsTypeCd())
                .bbsAtrbCd(dto.getBbsAttrCd())
                .ansPsblYn(dto.getReplyPsblYn())
                .fileAtchPsblYn(dto.getFileAtchPsblYn())
                .atchPsblFileCnt(dto.getAtchPsblFileCnt())
                .atchPsblFileSize(dto.getAtchPsblFileSize())
                .tmplatId(dto.getTmplatId())
                .useYn(dto.getUseYn())
                .blogId(dto.getBlogId())
                .blogYn(dto.getBlogYn())
                .cmntyId(dto.getCmntyId())
                .commentYn(dto.getCommentYn())
                .stsfdgYn(dto.getStsfdgYn())
                .createdBy(userId)
                .build();
        boardMasterRepository.save(entity);
        return entity.getBbsId();
    }

    @Transactional
    public void updateBoardMaster(String userId, BoardMasterDto dto) {
        BoardMaster entity = boardMasterRepository.findById(Objects.requireNonNull(dto.getBbsId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getBbsTtl(), dto.getBbsExpln(), dto.getReplyPsblYn(), dto.getFileAtchPsblYn(),
                dto.getAtchPsblFileCnt(), dto.getAtchPsblFileSize(), dto.getTmplatId(), dto.getUseYn(),
                dto.getCommentYn(), dto.getStsfdgYn());
        
        entity.setLastModifiedBy(userId);
    }

    @Transactional
    public void deleteBoardMaster(String userId, String bbsId) {
        BoardMaster entity = boardMasterRepository.findById(bbsId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.delete();
        entity.setLastModifiedBy(userId);
    }

    // --- Added back for test compatibility ---
    public boolean canUseSatisfaction(String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(m -> "Y".equals(m.getStsfdgYn()))
                .orElse(false);
    }

    public boolean canUseComment(String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(m -> "Y".equals(m.getCommentYn()))
                .orElse(false);
    }

    private final BlogRepository blogRepository;
    private final BlogUserRepository blogUserRepository;

    public Page<BlogDto> getBlogList(String searchCondition, String searchKeyword, @NonNull Pageable pageable) {
        return blogRepository.findAll(pageable).map(BlogDto::from);
    }

    public BlogDto getBlog(@NonNull String blogId) {
        return blogRepository.findById(blogId)
                .map(BlogDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void createBlog(String userId, BlogDto dto) {
        Blog entity = Blog.builder()
                .blogId(dto.getBlogId())
                .blogTtl(dto.getBlogTtl())
                .blogIntroCn(dto.getBlogIntroCn())
                .useYn("Y")
                .createdBy(userId)
                .build();
        blogRepository.save(entity);
    }

    @Transactional
    public void joinBlog(String blogId, String userId, String mngrYn) {
        BlogUser entity = BlogUser.builder()
                .blogId(blogId)
                .userId(userId)
                .mngrYn(mngrYn)
                .useYn("Y")
                .createdBy(userId)
                .build();
        blogUserRepository.save(entity);
    }

    public boolean checkBlogUser(String userId) {
        return blogRepository.existsByCreatedBy(userId);
    }

    public List<BlogDto> getBlogListPortlet() {
        return blogRepository.findAll(PageRequest.of(0, 10)).getContent().stream()
                .map(BlogDto::from)
                .collect(Collectors.toList());
    }

    private BoardMasterDto toDto(BoardMasterSearchResult projection) {
        return BoardMasterDto.builder()
                .bbsId(projection.getBbsId())
                .bbsTtl(projection.getBbsTtl())
                .bbsTypeCd(projection.getBbsTypeCd())
                .bbsAtrbCd(projection.getBbsAttrCd())
                .tmplatId(projection.getTmpltId())
                .useYn(projection.getUseYn())
                .frstRegisterPnttm(projection.getCreatedDate())
                .build();
    }
}

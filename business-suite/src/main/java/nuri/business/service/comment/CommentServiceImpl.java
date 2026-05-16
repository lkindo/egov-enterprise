package nuri.business.service.comment;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.comment.dto.CommentDto;
import nuri.business.service.comment.dto.CommentSaveRequest;
import nuri.business.service.comment.event.CommentCreatedEvent;
import nuri.business.service.comment.event.CommentDeletedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public Page<CommentDto> getComments(Long pstId, String bbsId, Pageable pageable) {
        return commentRepository
                .findByBbsIdAndPstId(Objects.requireNonNull(bbsId), Objects.requireNonNull(pstId),
                        Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public Page<CommentDto> getAllComments(Pageable pageable) {
        return commentRepository.findAll(Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public Page<CommentDto> searchComments(String keyword, Pageable pageable) {
        return commentRepository.findByCmntCnContaining(Objects.requireNonNull(keyword),
                Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public CommentDto getComment(Long id) {
        return commentRepository.findById(Objects.requireNonNull(id))
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public Long createComment(String userId, String userNm, CommentSaveRequest request) {        
        Comment comment = Comment.builder()
                .nttId(request.getNttId())
                .bbsId(request.getBbsId())
                .writerId(userId)
                .writerNm(userNm)
                .password(request.getPassword())
                .cmntCn(request.getCmntCn())
                .useYn("Y")
                .build();

        comment = commentRepository.save(comment);
        Long commentId = comment.getAnswerNo();
        
        // 이벤트 발행
        eventPublisher.publishEvent(new CommentCreatedEvent(this, request.getBbsId(), request.getNttId()));
        
        return commentId;
    }

    @Override
    @Transactional
    public void updateComment(Long id, String userId, CommentSaveRequest request) {
        Comment comment = commentRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        comment.update(request.getCmntCn());
    }

    @Override
    @Transactional
    public void deleteComment(Long id, String userId) {
        Comment comment = commentRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        comment.delete();
        
        // 이벤트 발행
        eventPublisher.publishEvent(new CommentDeletedEvent(this, comment.getBbsId(), comment.getNttId()));
    }

    private CommentDto convertToDto(Comment entity) {
        return CommentDto.builder()
                .id(entity.getAnswerNo())
                .nttId(entity.getNttId())
                .bbsId(entity.getBbsId())
                .writerId(entity.getWriterId())
                .writerNm(entity.getWriterNm())
                .cmntCn(entity.getCmntCn())
                .useYn(entity.getUseYn())
                .createdDate(entity.getCreatedDate())
                .modifiedDate(entity.getLastModifiedDate())
                .build();
    }
}

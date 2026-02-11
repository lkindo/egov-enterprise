package com.company.project.service.comment.dto;

import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.company.project.domain.comment.Comment;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentDto {
    private Long commentNo;
    @NotNull(message = "게시물 ID는 필수입니다.")
    private Long nttId;
    @NotBlank(message = "게시판 ID는 필수입니다.")
    private String bbsId;
    private String wrterId;
    private String wrterNm;
    private String password;
    @NotBlank(message = "내용은 필수입니다.")
    @Size(max = 2000, message = "내용은 2000자 이내여야 합니다.")
    private String commentCn;
    private String useAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static CommentDto from(Comment entity) {
        return CommentDto.builder()
                .commentNo(entity.getId())
                .nttId(entity.getNttId())
                .bbsId(entity.getBbsId())
                .wrterId(entity.getWrterId())
                .wrterNm(entity.getWrterNm())
                .password(entity.getPassword())
                .commentCn(entity.getCommentCn())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getModifiedDate())
                .build();
    }
}

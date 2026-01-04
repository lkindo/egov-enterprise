package com.company.project.service.comment.dto;

import java.time.LocalDateTime;
import com.company.project.domain.comment.Comment;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentDto {
    private Long commentNo;
    private Long nttId;
    private String bbsId;
    private String wrterId;
    private String wrterNm;
    private String password;
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

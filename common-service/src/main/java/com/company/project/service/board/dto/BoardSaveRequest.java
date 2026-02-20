package com.company.project.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.lang.NonNull;

@Schema(description = "Board Post Save Request")
public record BoardSaveRequest(
        @Schema(description = "Board ID") 
        @NotBlank(message = "Board ID is required.") 
        @NonNull String bbsId,

        @Schema(description = "Post Subject") 
        @NotBlank(message = "Subject is required.") 
        @Size(min = 1, max = 100, message = "Subject must be between 1 and 100 characters.") 
        @NonNull String nttSj,

        @Schema(description = "Post Content") 
        @NotBlank(message = "Content is required.") 
        @NonNull String nttCn,

        @Schema(description = "Notice Start Date") 
        String ntceBgnde,

        @Schema(description = "Notice End Date") 
        String ntceEndde,

        @Schema(description = "Attached File ID") 
        String atchFileId) {
}

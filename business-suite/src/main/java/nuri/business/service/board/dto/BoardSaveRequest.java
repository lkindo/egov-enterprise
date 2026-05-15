package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import org.springframework.lang.NonNull;


@Schema(description = "Board Post Save Request")
public record BoardSaveRequest(
                @Schema(description = "Board ID") @NotBlank(message = "Board ID is required.") @Size(max = 20) @NonNull String bbsId,

                @Schema(description = "Post Subject") @NotBlank(message = "Subject is required.") @Size(min = 1, max = 100, message = "Subject must be between 1 and 100 characters.") @NonNull String pstTtl,

                @Schema(description = "Post Content") @NotBlank(message = "Content is required.") @Size(max = 4000) @NonNull String pstCn,

                @Schema(description = "Notice Start Date") @Size(max = 10) String ntceBgnyYmd,

                @Schema(description = "Notice End Date") @Size(max = 10) String ntceEndYmd,

                @Schema(description = "Attached File ID") @Size(max = 20) String atchFileId,

                @Schema(description = "Notice Flag (Y/N)") @Pattern(regexp = "^[YN]$") String noticeYn,


                @Schema(description = "Event Date (ISO-8601)") @Size(max = 20) String eventDate,

                @Schema(description = "Q&A Status (OPEN/SOLVED)") @Size(max = 10) String qnaStatus,

                @Schema(description = "Q&A Category") @Size(max = 20) String qnaCategory,
                
                @Schema(description = "Secret Flag (Y/N)") @Pattern(regexp = "^[YN]$") String secretYn,


                @Schema(description = "Use Flag (Y/N)") @Pattern(regexp = "^[YN]$") String useYn,


                @Schema(description = "Author ID") @Size(max = 20) String ntcrId,

                @Schema(description = "Author Name") @Size(max = 60) String ntcrNm,

                @Schema(description = "Post Password") @Size(max = 200) String password) {
}

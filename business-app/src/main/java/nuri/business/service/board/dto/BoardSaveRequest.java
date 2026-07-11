package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import org.springframework.lang.NonNull;

@Schema(description = "게시글 저장 요청")
public record BoardSaveRequest(
                @Schema(description = "게시판 ID") @NotBlank(message = "Board ID is required.") @Size(max = 20) @NonNull String bbsId,

                @Schema(description = "게시글 제목") @NotBlank(message = "Subject is required.") @Size(min = 1, max = 100, message = "Subject must be between 1 and 100 characters.") @NonNull String pstTtl,

                @Schema(description = "게시글 내용") @NotBlank(message = "Content is required.") @Size(max = 4000) @NonNull String pstCn,

                @Schema(description = "게시 시작일자") @Size(max = 10) String pstBgngYmd,

                @Schema(description = "게시 종료일자") @Size(max = 10) String pstEndYmd,

                @Schema(description = "첨부파일 ID") @Size(max = 20) String atchFileId,

                @Schema(description = "행사 일자") @Size(max = 20) String evntDt,

                @Schema(description = "Q&A 상태 코드 (OPEN/SOLVED)") @Size(max = 12) String qnaSttsCd,

                @Schema(description = "Q&A 카테고리") @Size(max = 12) String qnaCatCd,
                
                @Schema(description = "비밀글 여부 (Y/N)") @Pattern(regexp = "^[YN]$") String scrtYn,

                @Schema(description = "사용 여부 (Y/N)") @Pattern(regexp = "^[YN]$") String useYn,

                @Schema(description = "작성자 ID") @Size(max = 20) String userId,

                @Schema(description = "작성자 명") @Size(max = 60) String userNm,

                @Schema(description = "게시글 비밀번호") @Size(max = 200) String pswd) {
}


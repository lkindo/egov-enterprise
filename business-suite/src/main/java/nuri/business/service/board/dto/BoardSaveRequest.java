package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import org.springframework.lang.NonNull;
import com.fasterxml.jackson.annotation.JsonProperty;


@Schema(description = "Board Post Save Request")
public record BoardSaveRequest(
                @Schema(description = "Board ID") @NotBlank(message = "Board ID is required.") @Size(max = 20) @NonNull String bbsId,

                @Schema(description = "Post Subject") @NotBlank(message = "Subject is required.") @Size(min = 1, max = 100, message = "Subject must be between 1 and 100 characters.") @NonNull String pstTtl,

                @Schema(description = "Post Content") @NotBlank(message = "Content is required.") @Size(max = 4000) @NonNull String pstCn,

                @Schema(description = "Notice Start Date") @Size(max = 10) @JsonProperty("bgngYmd") String pstBgngYmd,

                @Schema(description = "Notice End Date") @Size(max = 10) @JsonProperty("endYmd") String pstEndYmd,

                @Schema(description = "Attached File ID") @Size(max = 20) String atchFileId,

                @Schema(description = "Event Date (ISO-8601)") @Size(max = 20) @JsonProperty("eventDate") String evntDt,

                @Schema(description = "Q&A Status (OPEN/SOLVED)") @Size(max = 12) String qnaSttsCd,

                @Schema(description = "Q&A Category") @Size(max = 12) String qnaCatCd,
                
                @Schema(description = "Secret Flag (Y/N)") @Pattern(regexp = "^[YN]$") @JsonProperty("secretYn") String scrtYn,


                @Schema(description = "Use Flag (Y/N)") @Pattern(regexp = "^[YN]$") String useYn,


                @Schema(description = "Author ID") @Size(max = 20) String userId,

                @Schema(description = "Author Name") @Size(max = 60) String userNm,

                @Schema(description = "Post Password") @Size(max = 200) String pswd) {
    
    // legacy getters for compatibility
    public String nttSj() { return pstTtl; }
    public String nttCn() { return pstCn; }
    public String ntceBgngYmd() { return pstBgngYmd; }
    public String ntceEndYmd() { return pstEndYmd; }
    public String qnaStatus() { return qnaSttsCd; }
    public String qnaCategory() { return qnaCatCd; }
    public String ntcrId() { return userId; }
    public String ntcrNm() { return userNm; }
    public String password() { return pswd; }

    public String bgngYmd() { return pstBgngYmd; }
    public String endYmd() { return pstEndYmd; }
    public String eventDate() { return evntDt; }
    public String secretYn() { return scrtYn; }
}

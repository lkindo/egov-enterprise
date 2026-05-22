package nuri.foundation.service.program.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgramDto {
    @JsonProperty("progrmFileNm")
    private String prgrmFileNm;

    @JsonProperty("progrmStrePath")
    private String prgrmStrgPath;

    @JsonProperty("progrmKoreanNm")
    private String prgrmKornNm;

    private String url;

    @JsonProperty("progrmDc")
    private String prgrmExpln;
}


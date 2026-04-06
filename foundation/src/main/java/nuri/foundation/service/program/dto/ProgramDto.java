package nuri.foundation.service.program.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgramDto {
    private String progrmFileNm;
    private String progrmStrePath;
    private String progrmKoreanNm;
    private String url;
    private String progrmDc;
}

package nuri.foundation.service.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAuthorityDto {
    @JsonProperty("uniqId")
    @NonNull
    private String scrtyDcsnTrgtId;
    @JsonProperty("authorCode")
    @NonNull
    private String authrtId;
    @JsonProperty("mberTyCode")
    private String mbrTypeCd;
    private String userNm; // For display purposes if needed
}

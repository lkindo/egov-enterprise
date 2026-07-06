package nuri.business.service.board.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardMasterBatchDeleteRequest {
    private List<String> bbsIds;
}

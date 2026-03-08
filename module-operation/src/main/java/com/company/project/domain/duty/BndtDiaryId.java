package com.company.project.domain.duty;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BndtDiaryId implements Serializable {
    private String bndtId;
    private String bndtDe;
    private String bndtCeckSe;
    private String bndtCeckCd;
}

package com.company.project.domain.duty;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BndtManageId implements Serializable {
    private String bndtId; // Emplyr ID usually
    private String bndtDe; // Date
}

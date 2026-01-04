package com.company.project.domain.community;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CommunityUserId implements Serializable {
    private String cmmntyId;
    private String emplyrId;
}

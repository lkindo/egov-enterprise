package com.company.project.domain.namecard;

import java.io.Serializable;

/**
 * 嶺뚮ㅏ援잓뇡???????곌랜踰뤻뜮?????????
 */
public class NameCardUserId implements Serializable {
    private String ncrdId;
    private String emplyrId;

    public NameCardUserId() {}
    
    public NameCardUserId(String ncrdId, String emplyrId) {
        this.ncrdId = ncrdId;
        this.emplyrId = emplyrId;
    }

    public String getNcrdId() {
        return ncrdId;
    }

    public void setNcrdId(String ncrdId) {
        this.ncrdId = ncrdId;
    }

    public String getEmplyrId() {
        return emplyrId;
    }

    public void setEmplyrId(String emplyrId) {
        this.emplyrId = emplyrId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof NameCardUserId)) return false;

        NameCardUserId that = (NameCardUserId) o;

        if (ncrdId != null ? !ncrdId.equals(that.ncrdId) : that.ncrdId != null) return false;
        return emplyrId != null ? !emplyrId.equals(that.emplyrId) : that.emplyrId != null;
    }

    @Override
    public int hashCode() {
        int result = ncrdId != null ? ncrdId.hashCode() : 0;
        result = 31 * result + (emplyrId != null ? emplyrId.hashCode() : 0);
        return result;
    }
}

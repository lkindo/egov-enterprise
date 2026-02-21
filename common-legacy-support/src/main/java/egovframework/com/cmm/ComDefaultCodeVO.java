package egovframework.com.cmm;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * VO for Common Code
 **/
public class ComDefaultCodeVO implements Serializable {

    private static final long serialVersionUID = -339739578190300267L;

    /** Code ID **/
    @NotBlank(message = "Code ID is required.")
    @Size(max = 20, message = "Code ID must be 20 characters or less.")
    private String codeId = "";

    /** Code **/
    private String code = "";

    /** Code Name **/
    @NotBlank(message = "Code Name is required.")
    @Size(max = 100, message = "Code Name must be 100 characters or less.")
    private String codeNm = "";

    /** Code Description **/
    private String codeDc = "";

    /** Table Name **/
    private String tableNm = "";

    /** Have Detail Condition **/
    private String haveDetailCondition = "N";

    /** Detail Condition **/
    private String detailCondition = "";

    public String getCodeId() {
        return codeId;
    }

    public void setCodeId(String codeId) {
        this.codeId = codeId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getCodeNm() {
        return codeNm;
    }

    public void setCodeNm(String codeNm) {
        this.codeNm = codeNm;
    }

    public String getCodeDc() {
        return codeDc;
    }

    public void setCodeDc(String codeDc) {
        this.codeDc = codeDc;
    }

    public String getTableNm() {
        return tableNm;
    }

    public void setTableNm(String tableNm) {
        this.tableNm = tableNm;
    }

    public String getHaveDetailCondition() {
        return haveDetailCondition;
    }

    public void setHaveDetailCondition(String haveDetailCondition) {
        this.haveDetailCondition = haveDetailCondition;
    }

    public String getDetailCondition() {
        return detailCondition;
    }

    public void setDetailCondition(String detailCondition) {
        this.detailCondition = detailCondition;
    }

    @Override
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}

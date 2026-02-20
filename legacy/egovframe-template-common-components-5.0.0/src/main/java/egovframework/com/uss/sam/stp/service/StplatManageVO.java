package egovframework.com.uss.sam.stp.service;

/**
 * 
 * ?쎄??댁슜??泥섎━?섎뒗 VO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2016.06.13  ?λ룞??         ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *
 * </pre>
 */
public class StplatManageVO extends StplatManageDefaultVO {
	
    private static final long serialVersionUID = 1L;
    
    /** ?댁슜?쎄? ID */
    private String useStplatId;
    
	/** ?댁슜?쎄?紐?*/
    private String useStplatNm;    
    
    /** ?댁슜?쎄??댁슜 */
    private String useStplatCn;
    
    /** ?뺣낫?쒓났?숈쓽?댁슜 */
    private String infoProvdAgreCn;
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegistPnttm;
        
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterNm;
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;
    
    /** 理쒖큹?깅줉?륤D */
    private String frstRegisterId;

    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm;
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdtPnttm;

    /** 理쒖쥌?섏젙?륤D */
    private String lastUpdusrId;

	public String getUseStplatId() {
		return useStplatId;
	}

	public void setUseStplatId(String useStplatId) {
		this.useStplatId = useStplatId;
	}

	public String getUseStplatNm() {
		return useStplatNm;
	}

	public void setUseStplatNm(String useStplatNm) {
		this.useStplatNm = useStplatNm;
	}

	public String getUseStplatCn() {
		return useStplatCn;
	}

	public void setUseStplatCn(String useStplatCn) {
		this.useStplatCn = useStplatCn;
	}

	public String getInfoProvdAgreCn() {
		return infoProvdAgreCn;
	}

	public void setInfoProvdAgreCn(String infoProvdAgreCn) {
		this.infoProvdAgreCn = infoProvdAgreCn;
	}

	public String getFrstRegistPnttm() {
		return frstRegistPnttm;
	}

	public void setFrstRegistPnttm(String frstRegistPnttm) {
		this.frstRegistPnttm = frstRegistPnttm;
	}

	public String getFrstRegisterNm() {
		return frstRegisterNm;
	}

	public void setFrstRegisterNm(String frstRegisterNm) {
		this.frstRegisterNm = frstRegisterNm;
	}

	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	public String getLastUpdtPnttm() {
		return lastUpdtPnttm;
	}

	public void setLastUpdtPnttm(String lastUpdtPnttm) {
		this.lastUpdtPnttm = lastUpdtPnttm;
	}

	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

}

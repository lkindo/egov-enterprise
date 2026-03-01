package egovframework.com.dam.map.tea.service;

/**
 * 媛쒖슂
 * - 吏?앸㏊(議곗쭅蹂??????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 議곗쭅遺꾨쪟, ?깅줉?쇱옄, 吏?쓀RL ??ぉ??愿由ы븳??
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 22-7-2010 ?ㅼ쟾 10:57:44
 */
public class MapTeam {

	/**
	 * 議곗쭅ID
	 */
	private String orgnztId;
	/**
	 * 議곗쭅遺꾨쪟
	 */
	private String orgnztNm;
	/**
	 * 遺꾨쪟?쇱옄
	 */
	private String clYmd;
	/**
	 * 吏?쓀RL
	 */
	private String knoUrl;
    /**
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId = "";	
	/**
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnt;
	
	public String getOrgnztId() {
		return orgnztId;
	}
	public void setOrgnztId(String orgnztId) {
		this.orgnztId = orgnztId;
	}
	public String getOrgnztNm() {
		return orgnztNm;
	}
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}
	public String getClYmd() {
		return clYmd;
	}
	public void setClYmd(String clYmd) {
		this.clYmd = clYmd;
	}
	public String getKnoUrl() {
		return knoUrl;
	}
	public void setKnoUrl(String knoUrl) {
		this.knoUrl = knoUrl;
	}
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}	
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	public String getLastUpdusrPnt() {
		return lastUpdusrPnt;
	}
	public void setLastUpdusrPnt(String lastUpdusrPnt) {
		this.lastUpdusrPnt = lastUpdusrPnt;
	}

}

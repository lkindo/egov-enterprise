package egovframework.com.sym.mnu.mcm.service;

/** 
 * ???? ????? ?????? ???
 * @author ?? ?? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         ????
 *
 * </pre>
 **/
public class MenuSiteMap{
	   public String getCreatPersonId() {
		return creatPersonId;
	}
	public void setCreatPersonId(String creatPersonId) {
		this.creatPersonId = creatPersonId;
	}
	public String getMapCreatId() {
		return mapCreatId;
	}
	public void setMapCreatId(String mapCreatId) {
		this.mapCreatId = mapCreatId;
	}
	public String getBndeFileNm() {
		return bndeFileNm;
	}
	public void setBndeFileNm(String bndeFileNm) {
		this.bndeFileNm = bndeFileNm;
	}
	public String getBndeFilePath() {
		return bndeFilePath;
	}
	public void setBndeFilePath(String bndeFilePath) {
		this.bndeFilePath = bndeFilePath;
	}
	/** ???? **/
	   /** ??? ***/
	   private   String   creatPersonId;
	   /** ? **/
	   private   String   mapCreatId;
	   /** ??? **/
	   private   String   bndeFileNm;
	   /** ????**/
	   private   String   bndeFilePath;
}

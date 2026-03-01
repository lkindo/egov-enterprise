package egovframework.com.sym.mnu.mcm.service;

/** 
 * ?ъ씠?몃㏊ ?앹꽦???꾪븳 ?대옒?ㅻ? ?뺤쓽?쒕떎
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
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
	/** ?ъ씠?몃㏊ */
	   /** ?앹꽦?륤D **/
	   private   String   creatPersonId;
	   /** 留듭깮?켌D */
	   private   String   mapCreatId;
	   /** 留듯뙆?쇰챸 */
	   private   String   bndeFileNm;
	   /** 留듯뙆?쇨꼍濡?*/
	   private   String   bndeFilePath;
}

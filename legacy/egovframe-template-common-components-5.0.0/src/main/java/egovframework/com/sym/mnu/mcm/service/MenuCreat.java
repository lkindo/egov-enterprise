package egovframework.com.sym.mnu.mcm.service;
 
/** 
 * 硫붾돱?앹꽦 ?앹꽦???꾪븳 紐⑤뜽 ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
public class MenuCreat{
	   /** 硫붾돱踰덊샇 */
	   private   int      menuNo;
	   /** 留듭깮?켌D */
	   private   String   mapCreatId;
	   /** 沅뚰븳肄붾뱶 */
	   private   String   authorCode;
	public int getMenuNo() {
		return menuNo;
	}
	public void setMenuNo(int menuNo) {
		this.menuNo = menuNo;
	}
	public String getMapCreatId() {
		return mapCreatId;
	}
	public void setMapCreatId(String mapCreatId) {
		this.mapCreatId = mapCreatId;
	}
	public String getAuthorCode() {
		return authorCode;
	}
	public void setAuthorCode(String authorCode) {
		this.authorCode = authorCode;
	}
}

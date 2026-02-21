package egovframework.com.sym.mnu.mcm.service;
 
/** 
 * ??? ????? ???????? ???.
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
public class MenuCreat{
	   /** ?? **/
	   private   int      menuNo;
	   /** ? **/
	   private   String   mapCreatId;
	   /**  **/
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

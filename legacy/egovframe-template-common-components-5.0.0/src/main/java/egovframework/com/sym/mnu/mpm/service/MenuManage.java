package egovframework.com.sym.mnu.mpm.service;

/**
 * 硫붾돱愿由? 硫붾돱 ?앹꽦???꾪븳 紐⑤뜽 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜          理쒖큹 ?앹꽦
 *
 * </pre>
 */

public class MenuManage {

	/**
	 * 硫붾돱?ㅻ챸
	 */
	private String menuDc;
	public String getMenuDc() {
		return menuDc;
	}
	public void setMenuDc(String menuDc) {
		this.menuDc = menuDc;
	}
	public String getMenuNm() {
		return menuNm;
	}
	public void setMenuNm(String menuNm) {
		this.menuNm = menuNm;
	}
	public int getMenuNo() {
		return menuNo;
	}
	public void setMenuNo(int menuNo) {
		this.menuNo = menuNo;
	}
	public int getMenuOrdr() {
		return menuOrdr;
	}
	public void setMenuOrdr(int menuOrdr) {
		this.menuOrdr = menuOrdr;
	}
	public String getProgrmFileNm() {
		return progrmFileNm;
	}
	public void setProgrmFileNm(String progrmFileNm) {
		this.progrmFileNm = progrmFileNm;
	}
	public String getRelateImageNm() {
		return relateImageNm;
	}
	public void setRelateImageNm(String relateImageNm) {
		this.relateImageNm = relateImageNm;
	}
	public String getRelateImagePath() {
		return relateImagePath;
	}
	public void setRelateImagePath(String relateImagePath) {
		this.relateImagePath = relateImagePath;
	}
	public int getUpperMenuId() {
		return upperMenuId;
	}
	public void setUpperMenuId(int upperMenuId) {
		this.upperMenuId = upperMenuId;
	}
	/**
	 * 硫붾돱紐?
	 */
	private String menuNm;
	/**
	 * 硫붾돱踰덊샇
	 */
	private int menuNo;
	/**
	 * 硫붾돱?쒖꽌
	 */
	private int menuOrdr;
	/**
	 * ?꾨줈洹몃옩?뚯씪紐?
	 */
	private String progrmFileNm;
	/**
	 * 愿?⑥씠誘몄?紐?
	 */
	private String relateImageNm;
	/**
	 * 愿?⑥씠誘몄?寃쎈줈
	 */
	private String relateImagePath;
	/**
	 * ?곸쐞硫붾돱踰덊샇
	 */
	private int upperMenuId;
}
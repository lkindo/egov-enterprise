package egovframework.com.sec.drm.service;

import java.util.List;


/**
 * 遺?쒓텒?쒖뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?대Ц以          理쒖큹 ?앹꽦
 *
 * </pre>
 */

public class DeptAuthorVO extends DeptAuthor {
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * 遺?쒓텒?쒕ぉ濡?
	 */
	List <DeptAuthorVO> deptAuthorList;
	/**
	 * 遺?쒕ぉ濡?
	 */
	List <DeptAuthorVO> deptList;	
	/**
	 * 遺?쒖퐫??
	 */
	private String deptCode;
	/**
	 * 遺??紐?
	 */
	private String deptNm;
	
	/**
	 * deptAuthorList attribute 瑜?由ы꽩?쒕떎.
	 * @return List<DeptAuthorVO>
	 */
	public List<DeptAuthorVO> getDeptAuthorList() {
		return deptAuthorList;
	}
	/**
	 * deptAuthorList attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param deptAuthorList List<DeptAuthorVO> 
	 */
	public void setDeptAuthorList(List<DeptAuthorVO> deptAuthorList) {
		this.deptAuthorList = deptAuthorList;
	}
	/**
	 * deptList attribute 瑜?由ы꽩?쒕떎.
	 * @return List<DeptAuthorVO>
	 */
	public List<DeptAuthorVO> getDeptList() {
		return deptList;
	}
	/**
	 * deptList attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param deptList List<DeptAuthorVO> 
	 */
	public void setDeptList(List<DeptAuthorVO> deptList) {
		this.deptList = deptList;
	}
	/**
	 * deptCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getDeptCode() {
		return deptCode;
	}
	/**
	 * deptCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param deptCode String 
	 */
	public void setDeptCode(String deptCode) {
		this.deptCode = deptCode;
	}
	/**
	 * deptNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getDeptNm() {
		return deptNm;
	}
	/**
	 * deptNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param deptNm String 
	 */
	public void setDeptNm(String deptNm) {
		this.deptNm = deptNm;
	}
	
}

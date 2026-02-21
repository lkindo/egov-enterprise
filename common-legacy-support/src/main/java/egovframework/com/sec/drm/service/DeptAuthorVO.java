package egovframework.com.sec.drm.service;

import java.util.List;


/**
 * ????? ????Vo ?????? ???.
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??          ????
 *
 * </pre>
 **/

public class DeptAuthorVO extends DeptAuthor {
	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ??????
	 **/
	List <DeptAuthorVO> deptAuthorList;
	/**
	 * ????
	 **/
	List <DeptAuthorVO> deptList;	
	/**
	 * ?????
	 **/
	private String deptCode;
	/**
	 * ????
	 **/
	private String deptNm;
	
	/**
	 * deptAuthorList attribute ?????.
	 * @return List<DeptAuthorVO>
	 **/
	public List<DeptAuthorVO> getDeptAuthorList() {
		return deptAuthorList;
	}
	/**
	 * deptAuthorList attribute ???????.
	 * @param deptAuthorList List<DeptAuthorVO> 
	 **/
	public void setDeptAuthorList(List<DeptAuthorVO> deptAuthorList) {
		this.deptAuthorList = deptAuthorList;
	}
	/**
	 * deptList attribute ?????.
	 * @return List<DeptAuthorVO>
	 **/
	public List<DeptAuthorVO> getDeptList() {
		return deptList;
	}
	/**
	 * deptList attribute ???????.
	 * @param deptList List<DeptAuthorVO> 
	 **/
	public void setDeptList(List<DeptAuthorVO> deptList) {
		this.deptList = deptList;
	}
	/**
	 * deptCode attribute ?????.
	 * @return String
	 **/
	public String getDeptCode() {
		return deptCode;
	}
	/**
	 * deptCode attribute ???????.
	 * @param deptCode String 
	 **/
	public void setDeptCode(String deptCode) {
		this.deptCode = deptCode;
	}
	/**
	 * deptNm attribute ?????.
	 * @return String
	 **/
	public String getDeptNm() {
		return deptNm;
	}
	/**
	 * deptNm attribute ???????.
	 * @param deptNm String 
	 **/
	public void setDeptNm(String deptNm) {
		this.deptNm = deptNm;
	}
	
}

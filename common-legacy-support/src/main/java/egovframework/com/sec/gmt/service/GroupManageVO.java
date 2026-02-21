package egovframework.com.sec.gmt.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * ?? ????Vo ?????? ???.
 * 
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??          ????
 *   2025.06.26  ????         PMD???????? ????????-MethodReturnsInternalArray(??????? ?, ArrayIsStoredDirectly(????????
 *
 *      </pre>
 **/
public class GroupManageVO extends GroupManage {

	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ??
	 **/
	List<GroupManageVO> groupManageList;
	/**
	 * ????????
	 **/
	@Getter
	@Setter
	String[] delYn;

	/**
	 * groupManageList attribute ?????.
	 * 
	 * @return List<GroupManageVO>
	 **/
	public List<GroupManageVO> getGroupManageList() {
		return groupManageList;
	}

	/**
	 * groupManageList attribute ???????.
	 * 
	 * @param groupManageList List<GroupManageVO>
	 **/
	public void setGroupManageList(List<GroupManageVO> groupManageList) {
		this.groupManageList = groupManageList;
	}

}

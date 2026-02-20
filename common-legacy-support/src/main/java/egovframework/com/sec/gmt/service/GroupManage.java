package egovframework.com.sec.gmt.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?? ????model ?????? ???.
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

public class GroupManage extends ComDefaultVO {
	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ????
	 **/
	private GroupManage groupManage;
	/**
	 * ?ID
	 **/
	private String groupId;
	/**
	 * ?
	 **/
	private String groupNm;
	/**
	 * ???
	 **/
	private String groupCreatDe;
	/**
	 * ??
	 **/
	private String groupDc;
	
	/**
	 * groupManage attribute ?????.
	 * @return GroupManage
	 **/
	public GroupManage getGroupManage() {
		return groupManage;
	}
	/**
	 * groupManage attribute ???????.
	 * @param groupManage GroupManage 
	 **/
	public void setGroupManage(GroupManage groupManage) {
		this.groupManage = groupManage;
	}
	/**
	 * groupId attribute ?????.
	 * @return String
	 **/
	public String getGroupId() {
		return groupId;
	}
	/**
	 * groupId attribute ???????.
	 * @param groupId String 
	 **/
	public void setGroupId(String groupId) {
		this.groupId = groupId;
	}
	/**
	 * groupNm attribute ?????.
	 * @return String
	 **/
	public String getGroupNm() {
		return groupNm;
	}
	/**
	 * groupNm attribute ???????.
	 * @param groupNm String 
	 **/
	public void setGroupNm(String groupNm) {
		this.groupNm = groupNm;
	}
	/**
	 * groupCreatDe attribute ?????.
	 * @return String
	 **/
	public String getGroupCreatDe() {
		return groupCreatDe;
	}
	/**
	 * groupCreatDe attribute ???????.
	 * @param groupCreatDe String 
	 **/
	public void setGroupCreatDe(String groupCreatDe) {
		this.groupCreatDe = groupCreatDe;
	}
	/**
	 * groupDc attribute ?????.
	 * @return String
	 **/
	public String getGroupDc() {
		return groupDc;
	}
	/**
	 * groupDc attribute ???????.
	 * @param groupDc String 
	 **/
	public void setGroupDc(String groupDc) {
		this.groupDc = groupDc;
	}
	


}

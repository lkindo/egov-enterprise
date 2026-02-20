package egovframework.com.cop.bbs.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.exception.FdlException;

import egovframework.com.cmm.LoginVO;

/**
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??		?섏젙??	?섏젙?댁슜
 *  -------			--------	---------------------------
 *   2024.10.29		inganyoyo	Controller??Transaction 泥섎━瑜??섏? ?딆븘 Controller?먯꽌 ?ㅻ쪟 諛쒖깮 ???곗씠???뺥빀???ㅻ쪟 臾몄젣 諛쒖깮
 * </pre>
 */

public interface EgovBBSMasterService {

	Map<String, Object> selectNotUsedBdMstrList(BoardMasterVO boardMasterVO);

	void deleteBBSMasterInf(BoardMaster boardMaster);

	void updateBBSMasterInf(BoardMaster boardMaster) throws Exception;

	BoardMasterVO selectBBSMasterInf(BoardMasterVO boardMasterVO) throws Exception;

	Map<String, Object> selectBBSMasterInfs(BoardMasterVO boardMasterVO);
	
	void insertBBSMasterInf(BoardMaster boardMaster) throws Exception;

	/*
	 * 釉붾줈洹?愿??
	 */
	Map<String, Object> selectBlogMasterInfs(BoardMasterVO boardMasterVO);
	
	String checkBlogUser(BlogVO blogVO);
	
	BlogVO checkBlogUser2(BlogVO blogVO);

	void insertBoardBlogUserRqst(BlogUser blogUser);
	
	void insertBlogMaster(Blog blog) throws FdlException;

  void insertBlogMasterAndBoardBlogUserRqst(Blog blog, LoginVO user) throws Exception;

	BlogVO selectBlogDetail(BlogVO blogVO) throws Exception;

	List<BlogVO> selectBlogListPortlet(BlogVO blogVO) throws Exception;

	List<BoardMasterVO> selectBBSListPortlet(BoardMasterVO boardMasterVO) throws Exception;

}

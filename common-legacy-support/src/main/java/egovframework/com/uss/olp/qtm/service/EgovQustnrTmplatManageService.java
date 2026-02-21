package egovframework.com.uss.olp.qtm.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??????Service Class ?
 * 
 * @author ?????????
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ???         ????
 *
 *      </pre>
 **/
public interface EgovQustnrTmplatManageService {

	/**
	 * ???????????.
	 * 
	 * @param qustnrTmplatManageVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public Map<?, ?> selectQustnrTmplatManageTmplatImagepathnm(QustnrTmplatManageVO qustnrTmplatManageVO)
			throws Exception;

	/**
	 * ???????????.
	 * 
	 * @param searchVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectQustnrTmplatManageList(ComDefaultVO searchVO) throws Exception;

	/**
	 * ??????(?? ?????.
	 * 
	 * @param QustnrTmplatManage - ???? ??? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectQustnrTmplatManageDetail(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

	/**
	 * ??????(?? ?? ???? ???.
	 * 
	 * @param searchVO - ???? ?? VO
	 * @return int
	 * @throws Exception
	 **/
	public int selectQustnrTmplatManageListCnt(ComDefaultVO searchVO) throws Exception;

	/**
	 * ??????(?? ???.
	 * 
	 * @param searchVO - ???? ?? VO
	 * @throws Exception
	 **/
	void insertQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

	/**
	 * ??????(?? ????.
	 * 
	 * @param searchVO - ???? ?? VO
	 * @throws Exception
	 **/
	void updateQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

	/**
	 * ??????(?? ?????.
	 * 
	 * @param searchVO - ???? ?? VO
	 * @throws Exception
	 **/
	void deleteQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

}

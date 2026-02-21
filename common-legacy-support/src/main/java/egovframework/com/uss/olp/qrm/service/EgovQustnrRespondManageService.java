package egovframework.com.uss.olp.qrm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ???????Service Class ?
 * @author ?????????
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ???         ????
 *
 * </pre>
 **/
public interface EgovQustnrRespondManageService {

    /**
	 * ?????????.
	 * @param searchVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectQustnrRespondManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?????(?? ?????.
	 * @param qustnrRespondManageVO - ????? ??? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectQustnrRespondManageDetail(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;

    /**
	 * ?????(?? ?? ???? ???.
	 * @param searchVO - ???? ?? VO
	 * @return int
	 * @throws Exception
	 **/
	public int selectQustnrRespondManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?????(?? ???.
	 * @param qustnrRespondManageVO - ????? ??? VO
	 * @throws Exception
	 **/
	void  insertQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;

    /**
	 * ?????(?? ????.
	 * @param qustnrRespondManageVO - ????? ??? VO
	 * @throws Exception
	 **/
	void  updateQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;

    /**
	 * ?????(?? ?????.
	 * @param qustnrRespondManageVO - ????? ??? VO
	 * @throws Exception
	 **/
	void  deleteQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;


}

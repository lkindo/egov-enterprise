package egovframework.com.cop.smt.sim.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ????? ??? Service Class ?
 * @author ?????????
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.10  ???         ????
 *
 * </pre>
 **/
public interface EgovIndvdlSchdulManageService {


    /**
	 * ??? ??      ?     ?        ??   
	 * @param map -          ????                  ??       map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectIndvdlSchdulManageMainList(Map<String, String> map) throws Exception;

    /**
	 * ?? ??Map(map)??? ???.
	 * @param Map(map) - ???? ?? Map
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectIndvdlSchdulManageRetrieve(Map<String, String> map) throws Exception;


    /**
	 * ?? ??VO(model)??? ???.
	 * @param indvdlSchdulManageVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public IndvdlSchdulManageVO selectIndvdlSchdulManageDetailVO(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?? ?????.
	 * @param searchVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?????? ?????.
	 * @param indvdlSchdulManageVO - ?? ? ??? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageDetail(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?????? ?? ???? ???.
	 * @param searchVO - ???? ?? VO
	 * @return int
	 * @throws Exception
	 **/
	public int selectIndvdlSchdulManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?????? ???.
	 * @param indvdlSchdulManageVO - ?? ? ??? VO
	 * @throws Exception
	 **/
	void  insertIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?????? ????.
	 * @param indvdlSchdulManageVO - ?? ? ??? VO
	 * @throws Exception
	 **/
	void  updateIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?????? ?????.
	 * @param indvdlSchdulManageVO - ?? ? ??? VO
	 * @throws Exception
	 **/
	void  deleteIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;


}

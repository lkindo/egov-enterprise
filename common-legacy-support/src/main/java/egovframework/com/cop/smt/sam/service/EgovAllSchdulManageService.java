package egovframework.com.cop.smt.sam.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ???????? Service Class ?
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
public interface EgovAllSchdulManageService {
	
    /**
	 * ??? ?????. 
	 * @param searchVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectAllSchdulManageeList(ComDefaultVO searchVO) throws Exception;
	
    /**
	 * ??????? ?? ???? ???.
	 * @param searchVO - ???? ?? VO
	 * @return int
	 * @throws Exception
	 **/
	public int selectAllSchdulManageListCnt(ComDefaultVO searchVO) throws Exception;	
	
}

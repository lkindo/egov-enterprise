package egovframework.com.uss.sam.stp.service;

import java.util.List;

/**
 *
 * ?????????? ?????????
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ??         ????
 *   2016.06.13  ???         ???????v3.6 ?
 *
 * </pre>
 **/
public interface EgovStplatManageService {

    /**
	 * ???? ?????.
	 * @param vo
	 * @return ???
	 * @exception Exception
	 **/
	StplatManageVO selectStplatDetail(StplatManageVO vo) throws Exception;

    /**
	 * ????  ?????.
	 * @param searchVO
	 * @return  ?
	 * @exception Exception
	 **/
    List<StplatManageVO> selectStplatList(StplatManageDefaultVO searchVO) throws Exception;

    /**
	 * ????  ???????.
	 * @param searchVO
	 * @return  ????
	 **/
    int selectStplatListTotCnt(StplatManageDefaultVO searchVO);

	/**
	 * ???? ?????.
	 * @param vo
	 * @exception Exception
	 **/
    void insertStplatCn(StplatManageVO vo) throws Exception;


	/**
	 * ???? ??????.
	 * @param vo
	 * @exception Exception
	 **/
    void updateStplatCn(StplatManageVO vo) throws Exception;

	/**
	 * ???? ???????.
	 * @param vo
	 * @exception Exception
	 **/
    void deleteStplatCn(StplatManageVO vo) throws Exception;


}

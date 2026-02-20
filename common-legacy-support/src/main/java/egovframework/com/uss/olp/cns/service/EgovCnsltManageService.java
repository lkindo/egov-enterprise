package egovframework.com.uss.olp.cns.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;


/**
 *
 * ???????? ???? ? ?????
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
 *
 * </pre>
 **/
public interface EgovCnsltManageService {

    /**
	 * ??? ?????.
	 * @param vo
	 * @return ???
	 * @exception Exception
	 **/
	CnsltManageVO selectCnsltListDetail(CnsltManageVO vo) throws Exception;

	/**
	 * ??? ??????.(???? ??)
	 * @param vo
	 * @exception Exception
	 **/
    void updateCnsltInqireCo(CnsltManageVO vo) throws Exception;

    /**
	 * ???  ?????.
	 * @param searchVO
	 * @return  ?
	 * @exception Exception
	 **/
    List<EgovMap> selectCnsltList(CnsltManageDefaultVO searchVO) throws Exception;

    /**
	 * ???  ???????.
	 * @param searchVO
	 * @return  ????
	 **/
    int selectCnsltListTotCnt(CnsltManageDefaultVO searchVO);

	/**
	 * ??? ?????.
	 * @param vo - ???? ?? CnsltManageVO
	 * @exception Exception
	 **/
    void insertCnsltDtls(CnsltManageVO vo) throws Exception;

    /**
	 * ?????????.
	 * @param searchVO
	 * @return  ????
	 * @exception
	 **/
    int selectCnsltPasswordConfirmCnt(CnsltManageVO vo);

	/**
	 * ??? ??????.
	 * @param vo
	 * @exception Exception
	 **/
    void updateCnsltDtls(CnsltManageVO vo) throws Exception;

	/**
	 * ??? ???????.
	 * @param vo
	 * @exception Exception
	 **/
    void deleteCnsltDtls(CnsltManageVO vo) throws Exception;


    /**
	 * ???? ?????.
	 * @param vo
	 * @return ???
	 * @exception Exception
	 **/
	CnsltManageVO selectCnsltAnswerListDetail(CnsltManageVO vo) throws Exception;


    /**
	 * ????  ?????.
	 * @param searchVO
	 * @return  ?
	 * @exception Exception
	 **/
    List<EgovMap> selectCnsltAnswerList(CnsltManageDefaultVO searchVO) throws Exception;

    /**
	 * ????  ???????.
	 * @param searchVO
	 * @return  ????
	 * @exception
	 **/
    int selectCnsltAnswerListTotCnt(CnsltManageDefaultVO searchVO);

	/**
	 * ???? ??????.
	 * @param vo
	 * @exception Exception
	 **/
    void updateCnsltDtlsAnswer(CnsltManageVO vo) throws Exception;



}


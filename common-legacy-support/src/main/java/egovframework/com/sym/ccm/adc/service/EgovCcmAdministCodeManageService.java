package egovframework.com.sym.ccm.adc.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ??????????????????????? ???
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????         ????
 *
 * </pre>
 **/
public interface EgovCcmAdministCodeManageService {

	/**
	 * ?????????.
	 * @param administCode
	 * @throws Exception
	 **/
	void deleteAdministCode(AdministCode administCode) throws Exception;

	/**
	 * ???????.
	 * @param administCode
	 * @throws Exception
	 **/
	void insertAdministCode(AdministCode administCode) throws Exception;

	/**
	 * ?????????????.
	 * @param administCode
	 * @return AdministCode(????
	 * @throws Exception
	 **/
	AdministCode selectAdministCodeDetail(AdministCode administCode) throws Exception;

	/**
	 * ?????????.
	 * @param searchVO
	 * @return List(?????
	 * @throws Exception
	 **/
	List<EgovMap> selectAdministCodeList(AdministCodeVO searchVO) throws Exception;

    /**
	 * ???????????.
     * @param searchVO
     * @return int(????????
     **/
    int selectAdministCodeListTotCnt(AdministCodeVO searchVO) throws Exception;

	/**
	 * ????????.
	 * @param administCode
	 * @throws Exception
	 **/
	void updateAdministCode(AdministCode administCode) throws Exception;

}

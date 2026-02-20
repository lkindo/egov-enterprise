package egovframework.com.sym.ccm.zip.service;

import java.io.InputStream;
import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;


/**
 *
 * ?????????????????????? ???
 * @author ???????? ????
 * @since 2011.11.21
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *     ????     	????          ????
 *  -----------    --------    ---------------------------
 *   2011.11.21		????          ???????
 *
 * </pre>
 **/
public interface EgovCcmRdnmadZipManageService {

	/**
	 * ????????.
	 * @param zip
	 * @throws Exception
	 **/
	void deleteZip(Zip zip) throws Exception;

	/**
	 * ???????????.
	 * @throws Exception
	 **/
	void deleteAllZip() throws Exception;

	/**
	 * ??????.
	 * @param zip
	 * @throws Exception
	 **/
	void insertZip(Zip zip);

	/**
	 * ?????????????.
	 * @param zip
	 * @throws Exception
	 **/
	void insertExcelZip(InputStream file) throws Exception;

	/**
	 * ????????????.
	 * @param zip
	 * @return Zip(???
	 * @throws Exception
	 **/
	Zip selectZipDetail(Zip zip) throws Exception;

	/**
	 * ????????.
	 * @param searchVO
	 * @return List(????
	 * @throws Exception
	 **/
	List<EgovMap> selectZipList(ZipVO searchVO) throws Exception;

    /**
	 * ??????????.
     * @param searchVO
     * @return int(???????
     **/
    int selectZipListTotCnt(ZipVO searchVO) throws Exception;

	/**
	 * ???????.
	 * @param zip
	 * @throws Exception
	 **/
	void updateZip(Zip zip) throws Exception;

}

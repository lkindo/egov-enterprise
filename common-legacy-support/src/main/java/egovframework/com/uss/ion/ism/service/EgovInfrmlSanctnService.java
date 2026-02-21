package egovframework.com.uss.ion.ism.service;

import java.util.Map;

/**
 * ??
 * - ????? ????Service Interface?????.
 * 
 * ???
 * - ????? ?????, ??, ?????????.
 * - ??? ????????????.
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:29:25
 **/
public interface EgovInfrmlSanctnService {

	/**
	 * ????????.
	 * @param SanctnerVO
	 * @return  Map<String, Object>
	 * 
	 * @param sanctnerVO
	 **/
	public Map<String, Object> selectSanctnerList(SanctnerVO sanctnerVO) throws Exception;
	
	/**
	 * ??????????.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param infrmlSanctn
	 **/
	public InfrmlSanctn selectInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;
	
	/**
	 * ?????????????.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 **/
	public InfrmlSanctn updateInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;
	
	/**
	 * ?????????????.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 **/
	public InfrmlSanctn updateInfrmlSanctnConfm(InfrmlSanctn infrmlSanctn) throws Exception;
	
	/**
	 * ????????????.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 **/
	public InfrmlSanctn updateInfrmlSanctnReturn(InfrmlSanctn infrmlSanctn) throws Exception;

	/**
	 * ????????????.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 **/
	public InfrmlSanctn insertInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;

	/**
	 * ??????????????.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 **/
	public void deleteInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;

}

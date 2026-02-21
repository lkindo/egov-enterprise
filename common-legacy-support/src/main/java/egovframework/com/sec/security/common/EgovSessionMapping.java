package egovframework.com.sec.security.common;

import java.sql.ResultSet;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.egovframe.rte.fdl.security.userdetails.EgovUserDetails;
import org.egovframe.rte.fdl.security.userdetails.jdbc.EgovUsersByUsernameMapping;

import egovframework.com.cmm.LoginVO;

/**
 * mapRow ???????EgovUserDetails Object ?????.
 * 
 * @author ByungHun Woo
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    -------------    ----------------------
 *   2009.03.10  ByungHun Woo    ????
 *   2009.03.20  ??          UPDATE
 *
 * </pre>
 **/

public class EgovSessionMapping extends EgovUsersByUsernameMapping {
	
	/**
	 * ??????? ????????? EgovUsersByUsernameMapping ????.
	 * @param ds DataSource
	 * @param usersByUsernameQuery String
	 **/
	public EgovSessionMapping(DataSource ds, String usersByUsernameQuery) {
        super(ds, usersByUsernameQuery);
    }

	/**
	 * mapRow Override
	 * @param rs ResultSet ??
	 * @param rownum row num
	 * @return Object EgovUserDetails
	 * @exception SQLException
	 **/
	@Override
    protected EgovUserDetails mapRow(ResultSet rs, int rownum) throws SQLException {
    	logger.debug("## EgovUsersByUsernameMapping mapRow ##");

        String strUserId    = rs.getString("user_id");
        String strPassWord  = rs.getString("password");
        boolean strEnabled  = rs.getBoolean("enabled");
        
        String strUserNm    = rs.getString("user_nm");
        String strUserSe    = rs.getString("user_se");
        String strUserEmail = rs.getString("user_email");
        String strOrgnztId  = rs.getString("orgnzt_id");
        String strUniqId    = rs.getString("esntl_id");
        /**2010.06.30 *??   *???  **/
        String strOrgnztNm    = rs.getString("orgnzt_nm");

        

        // ????????
        LoginVO loginVO = new LoginVO();
        loginVO.setId(strUserId);
        loginVO.setPassword(strPassWord);
        loginVO.setName(strUserNm);
        loginVO.setUserSe(strUserSe);
        loginVO.setEmail(strUserEmail);
        loginVO.setOrgnztId(strOrgnztId);
        loginVO.setUniqId(strUniqId);
        /**2010.06.30 *??   *???  **/
        loginVO.setOrgnztNm(strOrgnztNm);
        
        return new EgovUserDetails(strUserId, strPassWord, strEnabled, loginVO);
    }
}

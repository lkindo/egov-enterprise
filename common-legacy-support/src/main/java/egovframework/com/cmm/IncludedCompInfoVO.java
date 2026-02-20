package egovframework.com.cmm;

/**
 * IncludedCompInfoVO ?????
 * 
 * <p>
 *  Description : IncludedInfo annotation????? ????????????? ? VO ?????
 * </p>
 * 
 * @author ???? ???
 * @since 2011.08.26
 * @version 2.0.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *  ????	????	????
 *  -------    	--------    ---------------------------
 *  2011.08.26	???		????
 * </pre>
 * 
 **/
public class IncludedCompInfoVO {
	
	private String name;
	private String listUrl;
	private int order;
	private int gid;
	
	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
	public String getListUrl() {
		return listUrl;
	}
	public void setListUrl(String listUrl) {
		this.listUrl = listUrl;
	}
	public int getOrder() {
		return order;
	}
	public void setOrder(int order) {
		this.order = order;
	}
	public int getGid() {
		return gid;
	}
	public void setGid(int gid) {
		this.gid = gid;
	}
}

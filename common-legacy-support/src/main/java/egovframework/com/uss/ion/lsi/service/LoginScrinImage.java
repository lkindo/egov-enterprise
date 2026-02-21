/**
 * ??
 * - ??????????model ?????? ???.
 * 
 * ???
 * - ?????????? ???? RL, ?????, ???? ?????????
 * @author ??
 * @version 1.0
 * @created 03-8-2009 ?? 2:08:55
 **/

package egovframework.com.uss.ion.lsi.service;

import egovframework.com.cmm.ComDefaultVO;

public class LoginScrinImage extends ComDefaultVO {

	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ??? ID
	 **/
	private String imageId;
	/**
	 * ????
	 **/	
	private String imageNm;
	/**
	 * ??????
	 **/	
	private String image;
	/**
	 * ?????? ???
	 **/	
	private String imageFile;
	/**
	 * ??? ??
	 **/	
	private String imageDc;
	/**
	 * ????
	 **/
	private String reflctAt;
	/**
	 * ?????ID
	 **/
	private String userId;
	/**
	 * ???
	 **/
	private String regDate;
	/**
	 * ???????
	 **/
	private boolean isAtchFile;
	/**
	 * @return the imageId
	 **/
	public String getImageId() {
		return imageId;
	}
	/**
	 * @param imageId the imageId to set
	 **/
	public void setImageId(String imageId) {
		this.imageId = imageId;
	}
	/**
	 * @return the imageNm
	 **/
	public String getImageNm() {
		return imageNm;
	}
	/**
	 * @param imageNm the imageNm to set
	 **/
	public void setImageNm(String imageNm) {
		this.imageNm = imageNm;
	}
	/**
	 * @return the image
	 **/
	public String getImage() {
		return image;
	}
	/**
	 * @param image the image to set
	 **/
	public void setImage(String image) {
		this.image = image;
	}
	/**
	 * @return the imageFile
	 **/
	public String getImageFile() {
		return imageFile;
	}
	/**
	 * @param imageFile the imageFile to set
	 **/
	public void setImageFile(String imageFile) {
		this.imageFile = imageFile;
	}
	/**
	 * @return the imageDc
	 **/
	public String getImageDc() {
		return imageDc;
	}
	/**
	 * @param imageDc the imageDc to set
	 **/
	public void setImageDc(String imageDc) {
		this.imageDc = imageDc;
	}
	/**
	 * @return the reflctAt
	 **/
	public String getReflctAt() {
		return reflctAt;
	}
	/**
	 * @param reflctAt the reflctAt to set
	 **/
	public void setReflctAt(String reflctAt) {
		this.reflctAt = reflctAt;
	}
	/**
	 * @return the userId
	 **/
	public String getUserId() {
		return userId;
	}
	/**
	 * @param userId the userId to set
	 **/
	public void setUserId(String userId) {
		this.userId = userId;
	}
	/**
	 * @return the regDate
	 **/
	public String getRegDate() {
		return regDate;
	}
	/**
	 * @param regDate the regDate to set
	 **/
	public void setRegDate(String regDate) {
		this.regDate = regDate;
	}
	/**
	 * @return the isAtchFile
	 **/
	public boolean isAtchFile() {
		return isAtchFile;
	}
	/**
	 * @param isAtchFile the isAtchFile to set
	 **/
	public void setAtchFile(boolean isAtchFile) {
		this.isAtchFile = isAtchFile;
	}	
	
	
}

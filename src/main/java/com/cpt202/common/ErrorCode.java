package com.cpt202.common;

public enum ErrorCode {

    SUCCESS(0, "ok", ""),
    PARAMS_ERROR(40000, "Invalid Request Parameters", ""),
    NULL_ERROR(40001, "Request Data is Null", ""),
    NOT_LOGIN(40100, "Not Logged In", ""),
    NO_AUTH(40101, "No Authorization", ""),
    SYSTEM_ERROR(50000, "System Internal Error", "")
    ,UPLOAD_ERROR(50001,"File Upload Failed" ,"" ),
    CODE_ERROR(40002,"Verification Code Error","");

    private final int code;

    /**
     * 状态码信息
     */
    private final String message;

    /**
     * 状态码描述（详情）
     */
    private final String description;

    ErrorCode(int code, String message, String description) {
        this.code = code;
        this.message = message;
        this.description = description;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }


    public String getDescription() {
        return description;
    }
}

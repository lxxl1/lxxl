package com.cpt202.common.enums;

public enum ResultCodeEnum {
    SUCCESS("200", "Success"), // 操作成功

    PARAM_ERROR("400", "Parameter Error"), // 参数错误
    PARAM_PASSWORD_ERROR("400", "Incorrect current password provided."), // 参数错误-当前密码错误
    TOKEN_INVALID_ERROR("401", "Invalid Token"), // Token无效或过期
    TOKEN_CHECK_ERROR("401", "Token Verification Failed"), // Token验证失败
    PARAM_LOST_ERROR("4001", "Parameter Missing"), // 参数缺失

    SYSTEM_ERROR("500", "System Error"), // 系统内部错误
    SYSTEM_TIMEOUT_ERROR("500", "System Timeout"), // 系统超时
    SYSTEM_CONFIG_ERROR("500", "System Configuration Error"), // 系统配置错误

    USER_EXIST_ERROR("5001", "Username Already Exists"), // 用户名已存在
    USER_NOT_LOGIN("5002", "User Not Logged In"), // 用户未登录
    USER_ACCOUNT_ERROR("5003", "Incorrect Username or Password"), // 用户名或密码错误
    USER_NOT_EXIST_ERROR("5004", "User Not Found"), // 用户不存在
    USER_ACCOUNT_FORBIDDEN_ERROR("5005", "Account Disabled"), // 账号已被禁用
    ACCOUNT_BANNED_ERROR("5006", "You are banned from logging in."), // 账号已被禁止登录 (新添加)

    ACCOUNT_INVALID_CHARACTER_ERROR("6000", "Username contains invalid characters."), // 用户名包含非法字符 (新添加)
    PARAM_NULL_ERROR("6001","Parameter cannot be null"), // 参数不能为空
    CODE_ERROR("6002","Verification code error"), // 验证码错误 (保留原始，虽然可能被EMAIL_CODE_MISMATCH_ERROR替代)
    UPLOAD_ERROR("6003","File upload error"), // 文件上传失败
    USERNAME_TOO_SHORT_ERROR("6004", "Username is too short (minimum 4 characters)."), // 用户名过短 (新添加)
    PASSWORD_TOO_SHORT_ERROR("6005", "Password is too short (minimum 8 characters)."), // 密码过短 (新添加)
    EMAIL_CODE_MISMATCH_ERROR("6006", "Incorrect email verification code."), // 邮箱验证码错误 (新添加)
    ACCOUNT_ALREADY_EXIST_ERROR("6007", "Account already exists."), // 账号已存在 (新添加)


    SONG_NOT_FOUND("7001", "Song not found"), // 歌曲未找到
    SONG_DELETE_FAILED("7002", "Failed to delete song"), // 歌曲删除失败
    SONG_UPDATE_FAILED("7003", "Failed to update song"), // 歌曲更新失败
    SONG_ADD_FAILED("7004", "Failed to add song"), // 歌曲添加失败
    SONG_FILE_UPLOAD_FAILED("7005", "Song file upload failed"), // 歌曲文件上传失败
    SONG_COVER_UPLOAD_FAILED("7006", "Song cover upload failed"), // 歌曲封面上传失败
    SONG_CATEGORY_UPDATE_FAILED("7007", "Failed to update song categories"), // 更新歌曲分类失败
    SONG_SINGER_UPDATE_FAILED("7008", "Failed to update song artists"), // 更新歌曲歌手失败

    SINGER_NOT_FOUND("8001", "Artist not found"), // 歌手未找到
    SINGER_DELETE_FAILED("8002", "Failed to delete artist"), // 歌手删除失败
    SINGER_UPDATE_FAILED("8003", "Failed to update artist"), // 歌手更新失败
    SINGER_ADD_FAILED("8004", "Failed to add artist"), // 歌手添加失败
    SINGER_AVATAR_UPLOAD_FAILED("8005", "Artist avatar upload failed"), // 歌手头像上传失败

    CATEGORY_NOT_FOUND("9001", "Category not found"), // 分类未找到
    CATEGORY_DELETE_FAILED("9002", "Failed to delete category"), // 分类删除失败
    CATEGORY_UPDATE_FAILED("9003", "Failed to update category"), // 分类更新失败
    CATEGORY_ADD_FAILED("9004", "Failed to add category"), // 分类添加失败
    ;

    public String code;
    public String msg;

    ResultCodeEnum(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }
}
package com.cpt202.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cpt202.domain.Mail;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface EmailMapper extends BaseMapper<Mail> {

    @Select("SELECT COUNT(*) FROM music.mail WHERE email = #{email}")
    int selectEmail(String email);

    @Insert("INSERT INTO music.mail(email, code) VALUES (#{email}, #{code})")
    int insert(Mail mail);

    @Update("UPDATE music.mail SET code = #{code} WHERE email = #{email}")
    void updateCodeByEmail(@Param("email") String email, @Param("code") String code);
}

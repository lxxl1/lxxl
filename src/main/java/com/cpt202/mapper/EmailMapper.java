package com.cpt202.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cpt202.domain.Mail;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface EmailMapper extends BaseMapper {

    @Select("SELECT COUNT(*) FROM cpt202.user WHERE email = #{email}")
    int selectEmail(String email);
    @Insert("insert into cpt202.mail(email, code) values (#{email},#{code})")
    void insert(Mail mail);
}

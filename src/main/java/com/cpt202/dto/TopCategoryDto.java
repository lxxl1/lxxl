package com.cpt202.dto;

import lombok.Data; // Assuming Lombok is used based on other potential DTOs

@Data // Or generate getters/setters manually
public class TopCategoryDto {
    private String categoryName;
    private Long songCount; // Use Long for counts to be safe
} 
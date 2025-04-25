package com.cpt202.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * DTO for returning extracted song metadata from a file.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongMetadataDTO {
    private String title;
    private String album;
    private Integer singerId; // Found or newly created singer ID, can be null if not found/created
    private String recognizedArtistName; // Original artist name string extracted from the file
} 